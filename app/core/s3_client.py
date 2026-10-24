import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.config import settings


class S3Service:
    def __init__(self):
        client_options = {
            "service_name": "s3",
            "aws_access_key_id": settings.AWS_ACCESS_KEY_ID,
            "aws_secret_access_key": settings.AWS_SECRET_ACCESS_KEY.get_secret_value(),
            "region_name": settings.AWS_DEFAULT_REGION,
            "config": Config(
                signature_version="s3v4",
                s3={"addressing_style": settings.S3_ADDRESSING_STYLE},
            ),
        }
        self.client = boto3.client(
            endpoint_url=settings.S3_ENDPOINT_URL,
            **client_options,
        )
        self.public_client = boto3.client(
            endpoint_url=settings.S3_PUBLIC_ENDPOINT_URL or settings.S3_ENDPOINT_URL,
            **client_options,
        )
        self.bucket = settings.S3_BUCKET_NAME

    def upload_file(self, file_obj, object_key: str, content_type: str):
        """Загружает файл из памяти в MinIO"""
        try:
            self.client.upload_fileobj(
                file_obj,
                self.bucket,
                object_key,
                ExtraArgs={"ContentType": content_type}
            )
            return True
        except ClientError as e:
            print(f"S3 Upload Error: {e}")
            return False

    def get_presigned_url(self, object_key: str):
        """Генерирует временную ссылку для скачивания"""
        try:
            url = self.public_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket, 'Key': object_key},
                ExpiresIn=int(settings.S3_PRESIGNED_TTL)
            )
            return url
        except ClientError as e:
            print(f"S3 Presigned URL Error: {e}")
            return None

s3_service = S3Service()
