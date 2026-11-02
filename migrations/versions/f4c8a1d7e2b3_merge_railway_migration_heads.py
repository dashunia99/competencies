"""merge Railway migration heads

Revision ID: f4c8a1d7e2b3
Revises: d9e8c7b6a5f4, 9d2b910f49c6
Create Date: 2026-11-02

"""

from typing import Sequence, Union


revision: str = "f4c8a1d7e2b3"
down_revision: Union[str, Sequence[str], None] = (
    "d9e8c7b6a5f4",
    "9d2b910f49c6",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
