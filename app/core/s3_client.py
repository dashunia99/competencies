import boto3
from botocore.exceptions import ClientError
from app.core.config import settings

class S3Service:
    def __init__(self):
        self.client = boto3.client(
            's3',
            endpoint_url=settings.S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY.get_secret_value()
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
            url = self.client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket, 'Key': object_key},
                ExpiresIn=int(settings.S3_PRESIGNED_TTL)
            )
            return url
        except ClientError as e:
            print(f"S3 Presigned URL Error: {e}")
            return None

# Глобальный экземпляр сервиса
s3_service = S3Service()