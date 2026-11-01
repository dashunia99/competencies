"""Seed the three supported account roles.

Revision ID: b7e91f4d0c22
Revises: a6f12c9d4e31
"""
from typing import Sequence, Union

from alembic import op


revision: str = "b7e91f4d0c22"
down_revision: Union[str, Sequence[str], None] = "a6f12c9d4e31"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO roles (name)
        SELECT required.name
        FROM (VALUES ('Сотрудник'), ('Эксперт'), ('Администратор')) AS required(name)
        WHERE NOT EXISTS (
            SELECT 1 FROM roles AS existing WHERE existing.name = required.name
        )
        """
    )


def downgrade() -> None:
    pass
