from fastapi import FastAPI, HTTPException, Depends, Response, Request, Cookie
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date, timedelta
from bson import ObjectId
import os, httpx, urllib.parse, asyncio
from icalendar import Calendar as iCal
from dateutil import rrule
from passlib.context import CryptContext
from jose import jwt, JWTError

MONGO_URL = os.getenv("MONGO_URL", "mongodb+srv://apartment-sync-2:d8m6omb6p6ps739q3jjg@customer-apps.a012hh.mongodb.net/?appName=apartment-sync-2&maxPoolSize=5&retryWrites=true&timeoutMS=10000&w=majority")
SECRET_KEY = os.getenv("SECRET_KEY", "cleanflow-secret-2026")
ALGORITHM = "HS256"

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
client = AsyncIOMotorClient(MONGO_URL)
db = client["cleanflow_db"]

USERS = {
    "Nikola": {"password": "admin", "role": "admin"},
    "uklid": {"password": "apartmany4u", "role": "cleaner"},
}

def create_token(data: dict):
    return jwt.encode({"sub": data["username"], "role": data["role"]}, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

def get_current_user(access_token: str = Cookie(None)):
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = verify_token(access_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload

def str_id(obj):
    if obj and "_id" in obj:
        obj["id"] = str(obj["_id"])
        del obj["_id"]
    return obj

# --- AUTH ---
class LoginData(BaseModel):
    username: str
    password: str

@app.post("/api/auth/login")
async def login(data: LoginData, response: Response):
    user = USERS.get(data.username)
    if not user or user["password"] != data.password:
        raise HTTPException(status_code=401, detail="Špatné přihlašovací údaje")
    token = create_token({"username": data.username, "role": user["role"]})
    response.set_cookie("access_token", token, httponly=True, samesite="lax", max_age=86400*30)
    return {"username": data.username, "role": user["role"]}

@app.post("/api/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"ok": True}

@app.get("/api/auth/me")
async def me(user=Depends(get_current_user)):
    return user

# --- APARTMENTS ---
class ApartmentIn(BaseModel):
    name: str
    color: str = "#002FA7"
    checkin_time: str = "15:00"
    checkout_time: str = "11:00"
    ical_booking: Optional[str] = None
    ical_airbnb: Optional[str] = None

@app.get("/api/apartments")
async def get_apartments(user=Depends(get_current_user)):
    apts = []
    async for a in db.apartments.find({"user_id": user["sub"]}):
        apts.append(str_id(a))
    return apts

@app.post("/api/apartments")
async def create_apartment(data: ApartmentIn, user=Depends(get_current_user)):
    doc = data.dict()
    doc["user_id"] = user["sub"]
    doc["created_at"] = datetime.utcnow()
    doc["sync_status"] = {}
    result = await db.apartments.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    del doc["_id"]
    return doc

@app.put("/api/apartments/{apt_id}")
async def update_apartment(apt_id: str, data: ApartmentIn, user=Depends(get_current_user)):
    await db.apartments.update_one(
        {"_id": ObjectId(apt_id), "user_id": user["sub"]},
        {"$set": data.dict()}
    )
    return {"ok": True}

@app.delete("/api/apartments/{apt_id}")
async def delete_apartment(apt_id: str, user=Depends(get_current_user)):
    await db.apartments.delete_one({"_id": ObjectId(apt_id), "user_id": user["sub"]})
    await db.reservations.delete_many({"apartment_id": apt_id})
    return {"ok": True}

# --- ICAL SYNC ---
async def fetch_ical(url: str) -> str:
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    async with httpx.AsyncClient(follow_redirects=True, timeout=20) as client:
        # Zkus přímé stažení
        try:
            r = await client.get(url, headers=headers)
            if r.status_code == 200 and "BEGIN:VCALENDAR" in r.text:
                return r.text
        except:
            pass
        # Fallback na allorigins proxy
        encoded = urllib.parse.quote(url, safe="")
        proxy = f"https://api.allorigins.win/raw?url={encoded}"
        r = await client.get(proxy, headers=headers, timeout=30)
        if r.status_code == 200 and "BEGIN:VCALENDAR" in r.text:
            return r.text
        raise ValueError(f"Nepodařilo se stáhnout iCal: HTTP {r.status_code}")

def parse_ical(text: str, source: str, apartment_id: str, user_id: str) -> list:
    reservations = []
    try:
        cal = iCal.from_ical(text)
        for component in cal.walk():
            if component.name != "VEVENT":
                continue
            uid = str(component.get("UID", ""))
            summary = str(component.get("SUMMARY", ""))
            dtstart = component.get("DTSTART")
            dtend = component.get("DTEND")
            if not dtstart or not dtend:
                continue
            start = dtstart.dt
            end = dtend.dt
            if hasattr(start, 'date'):
                start = start.date()
            if hasattr(end, 'date'):
                end = end.date()
            blocked = "not available" in summary.lower() or "closed" in summary.lower() or "unavailable" in summary.lower()
            reservations.append({
                "uid": uid,
                "apartment_id": apartment_id,
                "user_id": user_id,
                "source": source,
                "checkin": start.isoformat(),
                "checkout": end.isoformat(),
                "summary": summary,
                "blocked": blocked,
                "notified": False,
                "updated_at": datetime.utcnow(),
            })
    except Exception as e:
        print(f"Parse error: {e}")
    return reservations

@app.post("/api/apartments/{apt_id}/sync")
async def sync_apartment(apt_id: str, user=Depends(get_current_user)):
    apt = await db.apartments.find_one({"_id": ObjectId(apt_id), "user_id": user["sub"]})
    if not apt:
        raise HTTPException(status_code=404)
    
    sync_status = {}
    all_reservations = []

    for source, url_field in [("booking", "ical_booking"), ("airbnb", "ical_airbnb")]:
        url = apt.get(url_field)
        if not url:
            continue
        try:
            text = await fetch_ical(url)
            reservations = parse_ical(text, source, apt_id, user["sub"])
            all_reservations.extend(reservations)
            blocked_count = sum(1 for r in reservations if r["blocked"])
            sync_status[source] = {
                "ok": True,
                "reservations": len([r for r in reservations if not r["blocked"]]),
                "blocked": blocked_count,
                "synced_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            err = str(e)
            if "403" in err or "forbidden" in err.lower():
                code = "forbidden"
            elif "token" in err.lower() or "400" in err:
                code = "invalid_token"
            elif "timeout" in err.lower():
                code = "timeout"
            else:
                code = "fetch_error"
            sync_status[source] = {"ok": False, "error": code}

    # Ulož rezervace (upsert podle uid)
    for res in all_reservations:
        await db.reservations.update_one(
            {"uid": res["uid"], "apartment_id": apt_id},
            {"$set": res},
            upsert=True
        )
        # Vytvoř cleaning task pokud není blokace
        if not res["blocked"]:
            checkout = res["checkout"]
            existing = await db.cleaning_tasks.find_one({"apartment_id": apt_id, "checkout_date": checkout})
            if not existing:
                await db.cleaning_tasks.insert_one({
                    "apartment_id": apt_id,
                    "user_id": user["sub"],
                    "checkout_date": checkout,
                    "status": "pending",
                    "cleaner_id": None,
                    "scheduled_at": None,
                    "created_at": datetime.utcnow(),
                    "reservation_uid": res["uid"],
                    "summary": res["summary"],
                })

    await db.apartments.update_one(
        {"_id": ObjectId(apt_id)},
        {"$set": {"sync_status": sync_status, "last_synced": datetime.utcnow()}}
    )
    return {"ok": True, "sync_status": sync_status}

@app.post("/api/sync-all")
async def sync_all(user=Depends(get_current_user)):
    results = {}
    async for apt in db.apartments.find({"user_id": user["sub"]}):
        apt_id = str(apt["_id"])
        try:
            # Reuse sync logic
            sync_status = {}
            for source, url_field in [("booking", "ical_booking"), ("airbnb", "ical_airbnb")]:
                url = apt.get(url_field)
                if not url:
                    continue
                try:
                    text = await fetch_ical(url)
                    reservations = parse_ical(text, source, apt_id, user["sub"])
                    for res in reservations:
                        await db.reservations.update_one(
                            {"uid": res["uid"], "apartment_id": apt_id},
                            {"$set": res}, upsert=True
                        )
                        if not res["blocked"]:
                            existing = await db.cleaning_tasks.find_one({"apartment_id": apt_id, "checkout_date": res["checkout"]})
                            if not existing:
                                await db.cleaning_tasks.insert_one({
                                    "apartment_id": apt_id, "user_id": user["sub"],
                                    "checkout_date": res["checkout"], "status": "pending",
                                    "cleaner_id": None, "scheduled_at": None,
                                    "created_at": datetime.utcnow(),
                                    "reservation_uid": res["uid"], "summary": res["summary"],
                                })
                    sync_status[source] = {"ok": True, "reservations": len([r for r in reservations if not r["blocked"]])}
                except Exception as e:
                    sync_status[source] = {"ok": False, "error": str(e)[:50]}
            await db.apartments.update_one({"_id": apt["_id"]}, {"$set": {"sync_status": sync_status, "last_synced": datetime.utcnow()}})
            results[apt_id] = sync_status
        except Exception as e:
            results[apt_id] = {"error": str(e)}
    return results

# --- RESERVATIONS / CALENDAR ---
@app.get("/api/reservations")
async def get_reservations(apartment_id: Optional[str] = None, month: Optional[str] = None, user=Depends(get_current_user)):
    query = {"user_id": user["sub"]}
    if apartment_id:
        query["apartment_id"] = apartment_id
    if month:
        # month = "2026-06"
        try:
            y, m = month.split("-")
            start = date(int(y), int(m), 1)
            if int(m) == 12:
                end = date(int(y)+1, 1, 1)
            else:
                end = date(int(y), int(m)+1, 1)
            query["$or"] = [
                {"checkin": {"$gte": start.isoformat(), "$lt": end.isoformat()}},
                {"checkout": {"$gt": start.isoformat(), "$lte": end.isoformat()}},
                {"checkin": {"$lt": start.isoformat()}, "checkout": {"$gt": end.isoformat()}}
            ]
        except:
            pass
    
    reservations = []
    async for r in db.reservations.find(query):
        reservations.append(str_id(r))
    return reservations

# --- CLEANING TASKS ---
@app.get("/api/cleanings")
async def get_cleanings(user=Depends(get_current_user)):
    tasks = []
    apt_map = {}
    async for a in db.apartments.find({"user_id": user["sub"]}):
        apt_map[str(a["_id"])] = a
    async for t in db.cleaning_tasks.find({"user_id": user["sub"]}).sort("checkout_date", 1):
        t = str_id(t)
        apt = apt_map.get(t["apartment_id"], {})
        t["apartment_name"] = apt.get("name", "?")
        t["apartment_color"] = apt.get("color", "#ccc")
        tasks.append(t)
    return tasks

@app.put("/api/cleanings/{task_id}")
async def update_cleaning(task_id: str, data: dict, user=Depends(get_current_user)):
    await db.cleaning_tasks.update_one(
        {"_id": ObjectId(task_id), "user_id": user["sub"]},
        {"$set": data}
    )
    return {"ok": True}

@app.get("/api/cleanings/for-cleaner")
async def cleanings_for_cleaner(user=Depends(get_current_user)):
    today = date.today().isoformat()
    tasks = []
    async for t in db.cleaning_tasks.find({"checkout_date": {"$gte": today}, "status": {"$ne": "done"}}).sort("checkout_date", 1):
        apt = await db.apartments.find_one({"_id": ObjectId(t["apartment_id"])})
        t = str_id(t)
        t["apartment_name"] = apt.get("name", "?") if apt else "?"
        tasks.append(t)
    return tasks

# --- CLEANERS ---
class CleanerIn(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None

@app.get("/api/cleaners")
async def get_cleaners(user=Depends(get_current_user)):
    cleaners = []
    async for c in db.cleaners.find({"user_id": user["sub"]}):
        cleaners.append(str_id(c))
    return cleaners

@app.post("/api/cleaners")
async def create_cleaner(data: CleanerIn, user=Depends(get_current_user)):
    doc = data.dict()
    doc["user_id"] = user["sub"]
    result = await db.cleaners.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return doc

@app.put("/api/cleaners/{cleaner_id}")
async def update_cleaner(cleaner_id: str, data: CleanerIn, user=Depends(get_current_user)):
    await db.cleaners.update_one({"_id": ObjectId(cleaner_id)}, {"$set": data.dict()})
    return {"ok": True}

@app.delete("/api/cleaners/{cleaner_id}")
async def delete_cleaner(cleaner_id: str, user=Depends(get_current_user)):
    await db.cleaners.delete_one({"_id": ObjectId(cleaner_id)})
    return {"ok": True}

@app.get("/health")
async def health():
    return {"status": "ok"}
