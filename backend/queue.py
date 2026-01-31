import os

from redis import Redis
from rq import Queue


def get_redis() -> Redis:
    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        raise RuntimeError("Missing required env var: REDIS_URL")
    return Redis.from_url(redis_url)


def get_queue() -> Queue:
    return Queue("audio", connection=get_redis(), default_timeout=3600)
