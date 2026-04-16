from fastapi import FastAPI
import os

app = FastAPI()


@app.get("/api/ping")
async def ping():
    return {"pong": True, "env": os.getenv('ENV', 'development')}
