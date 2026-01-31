import os
from dataclasses import dataclass
from typing import Optional

import oss2


def _require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required env var: {name}")
    return value


@dataclass
class SignedUpload:
    upload_url: str
    file_url: str
    headers: dict
    object_key: str


class OssStorage:
    def __init__(
        self,
        endpoint: str,
        bucket_name: str,
        access_key_id: str,
        access_key_secret: str,
        public_base_url: Optional[str] = None,
        signed_downloads: bool = False,
    ):
        self.endpoint = endpoint
        self.bucket_name = bucket_name
        self.auth = oss2.Auth(access_key_id, access_key_secret)
        self.bucket = oss2.Bucket(self.auth, endpoint, bucket_name)
        self.public_base_url = public_base_url
        self.signed_downloads = signed_downloads

    @classmethod
    def from_env(cls) -> "OssStorage":
        endpoint = _require_env("OSS_ENDPOINT")
        bucket_name = _require_env("OSS_BUCKET")
        access_key_id = _require_env("OSS_ACCESS_KEY_ID")
        access_key_secret = _require_env("OSS_ACCESS_KEY_SECRET")
        public_base_url = os.getenv("OSS_PUBLIC_BASE_URL")
        signed_downloads = os.getenv("OSS_SIGNED_DOWNLOADS", "false").lower() == "true"
        return cls(
            endpoint=endpoint,
            bucket_name=bucket_name,
            access_key_id=access_key_id,
            access_key_secret=access_key_secret,
            public_base_url=public_base_url,
            signed_downloads=signed_downloads,
        )

    def _normalize_host(self) -> str:
        host = self.endpoint
        if host.startswith("https://"):
            host = host[len("https://") :]
        elif host.startswith("http://"):
            host = host[len("http://") :]
        return host

    def build_public_url(self, object_key: str) -> str:
        if self.public_base_url:
            base = self.public_base_url.rstrip("/")
            return f"{base}/{object_key}"
        host = self._normalize_host()
        return f"https://{self.bucket_name}.{host}/{object_key}"

    def sign_put(self, object_key: str, content_type: str, expires: int = 900) -> SignedUpload:
        headers = {"Content-Type": content_type}
        upload_url = self.bucket.sign_url("PUT", object_key, expires, headers=headers, slash_safe=True)
        return SignedUpload(
            upload_url=upload_url,
            file_url=self.build_public_url(object_key),
            headers=headers,
            object_key=object_key,
        )

    def upload_file(self, local_path: str, object_key: str) -> str:
        self.bucket.put_object_from_file(object_key, local_path)
        return self.build_public_url(object_key)

    def download_url(self, object_key: str, expires: int = 3600) -> str:
        if not self.signed_downloads:
            return self.build_public_url(object_key)
        return self.bucket.sign_url("GET", object_key, expires, slash_safe=True)
