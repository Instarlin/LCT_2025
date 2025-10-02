import logging
import os
from dataclasses import dataclass
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class InferenceRequest:
    job_uuid: str
    input_object: str
    output_object: Optional[str] = None
    profile: str = "balanced"
    threshold: float = 0.55


@dataclass(frozen=True)
class InferenceResult:
    job_uuid: str
    output_object: str
    file_size: int
    duration_seconds: float


class ModelAdapter:
    """Thin HTTP client that forwards inference jobs to the ML container."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout_seconds: int = 600,
    ) -> None:
        self.base_url = base_url or os.getenv("ML_SERVICE_URL", "http://ml-service:8080")
        self.timeout_seconds = timeout_seconds

    async def run_inference(self, request: InferenceRequest) -> InferenceResult:
        payload = {
            "job_uuid": request.job_uuid,
            "input_object": request.input_object,
            "output_object": request.output_object,
            "profile": request.profile,
            "threshold": request.threshold,
        }

        async with httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout_seconds) as client:
            logger.info("Submitting inference request for job %s", request.job_uuid)
            try:
                response = await client.post("/infer", json=payload)
            except httpx.RequestError as exc:
                logger.exception("Could not reach ML service: %s", exc)
                raise

        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.exception("Inference request failed: %s", exc.response.text)
            raise

        data = response.json()
        logger.info("Inference for job %s completed", request.job_uuid)

        return InferenceResult(
            job_uuid=data["job_uuid"],
            output_object=data["output_object"],
            file_size=data.get("file_size", 0),
            duration_seconds=data.get("duration_seconds", 0.0),
        )


__all__ = ["ModelAdapter", "InferenceRequest", "InferenceResult"]
