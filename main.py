from pathlib import Path

from fastapi import FastAPI, Request, Query
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from app.config import settings
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from app.chat import router as chat_router


app = FastAPI()
app.include_router(chat_router, tags=["chat"])
app.add_middleware(ProxyHeadersMiddleware)


BASE_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")


@app.get("/", response_class=HTMLResponse)
async def home_page(request: Request):
    context = {"request": request}
    return templates.TemplateResponse("home.html", context=context)


@app.get("/chat/{chat_id}", response_class=HTMLResponse)
async def chat_page(request: Request, chat_id: str, name: str = Query(default=None)):
    base_url = str(request.url).split("?")[0]

    context = {
        "request": request,
        "chat_id": chat_id,
        "ws_base_url": settings.WS_BASE_URL,
        "username": name,
        "share_url": base_url,
    }
    return templates.TemplateResponse("chat.html", context=context)
