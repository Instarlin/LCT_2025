import asyncio
import logging
from collections import defaultdict
from typing import Dict, Set

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class JobWebSocketManager:
    def __init__(self) -> None:
        self._connections: Dict[str, Set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, job_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections[job_id].add(websocket)
        logger.debug("WebSocket connected for job %s", job_id)

    async def disconnect(self, job_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            connections = self._connections.get(job_id)
            if connections and websocket in connections:
                connections.remove(websocket)
                if not connections:
                    self._connections.pop(job_id, None)
        logger.debug("WebSocket disconnected for job %s", job_id)

    async def broadcast(self, job_id: str, message: dict) -> None:
        async with self._lock:
            connections = list(self._connections.get(job_id, set()))
        if not connections:
            return

        status = None
        job_payload = message.get("job") if isinstance(message, dict) else None
        if isinstance(job_payload, dict):
            status = job_payload.get("status")
        terminal = isinstance(status, str) and status.lower() in {"succeeded", "success", "failed", "completed"}

        disconnected = []
        for websocket in connections:
            try:
                await websocket.send_json(message)
                if terminal:
                    await websocket.close()
                    disconnected.append(websocket)
            except Exception:
                logger.warning("WebSocket send failed for job %s; removing connection", job_id)
                disconnected.append(websocket)

        if disconnected:
            async with self._lock:
                conns = self._connections.get(job_id)
                if not conns:
                    return
                for ws in disconnected:
                    conns.discard(ws)
                if not conns:
                    self._connections.pop(job_id, None)
