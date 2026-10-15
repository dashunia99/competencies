"""merge_competencies_and_program_items

Revision ID: 459bd0c06ec1
Revises: 244634c9c051, 53f6074b284a
Create Date: 2026-10-15 10:54:17.924858

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '459bd0c06ec1'
down_revision: Union[str, Sequence[str], None] = ('244634c9c051', '53f6074b284a')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
