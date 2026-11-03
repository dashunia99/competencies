from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, root_validator


class SubmitAssignmentSchema(BaseModel):
    content: Optional[str] = None
    link: Optional[str] = None
    file_key: Optional[str] = None  # <-- Добавили возможность сдать файлом!

    @root_validator(pre=True)
    def check_at_least_one(cls, values):
        if not values.get("content") and not values.get("link") and not values.get("file_key"):
            raise ValueError("Необходимо передать хотя бы одно поле: content, link или file_key")
        return values


class ReviewSubmissionSchema(BaseModel):
    decision: str  # "accepted" или "returned"
    comment: Optional[str] = None

    @root_validator(pre=True)
    def validate_review(cls, values):
        dec = values.get("decision")
        comm = values.get("comment")
        if dec not in ["accepted", "returned"]:
            raise ValueError("Решение должно быть 'accepted' или 'returned'")
        if dec == "returned" and not comm:
            raise ValueError("При возврате работы на доработку (returned) комментарий обязателен")
        return values