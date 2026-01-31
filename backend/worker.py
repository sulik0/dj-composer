from rq import Connection, Worker

from .queue import get_redis
from dotenv import load_dotenv


if __name__ == "__main__":
    load_dotenv()
    with Connection(get_redis()):
        worker = Worker(["audio"])
        worker.work()
