from typing import Optional

from fastapi import FastAPI
from pydantic import BaseModel

from ml.config import BACKEND_BASE
from ml.services.logic import handle_chat


app = FastAPI(title="Student Assistant ML Service", version="0.4.0")


class ChatRequest(BaseModel):
    user_id: Optional[str] = None
    message: str


class ChatResponse(BaseModel):
    reply: str


@app.get("/health")
def health():
    return {"status": "ok", "backend": str(BACKEND_BASE)}


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
  
    reply = handle_chat(req.message, req.user_id)
    return ChatResponse(reply=reply)
