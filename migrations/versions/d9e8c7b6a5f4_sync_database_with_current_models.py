"""sync database schema with current application models

Revision ID: d9e8c7b6a5f4
Revises: b43f2b65275d
Create Date: 2026-10-30

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d9e8c7b6a5f4"
down_revision: Union[str, Sequence[str], None] = "b43f2b65275d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # The old program_items schema referenced a competency directly. The current
    # model references either a material or a task and calls order_index position.
    op.alter_column(
        "program_items",
        "order_index",
        existing_type=sa.Integer(),
        new_column_name="position",
    )
    op.add_column(
        "program_items",
        sa.Column("material_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "program_items",
        sa.Column("task_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_program_items_material_id",
        "program_items",
        "materials",
        ["material_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_program_items_task_id",
        "program_items",
        "tasks",
        ["task_id"],
        ["id"],
        ondelete="CASCADE",
    )
    # There is no deterministic conversion from the legacy competency target to
    # a material or task. Refuse to silently discard that association on a
    # populated database; a new Railway database passes this guard immediately.
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM program_items WHERE competency_id IS NOT NULL
            ) THEN
                RAISE EXCEPTION
                    'legacy program_items must be converted to material_id or task_id before migration';
            END IF;
        END
        $$
        """
    )
    op.drop_column("program_items", "competency_id")

    op.add_column(
        "user_programs",
        sa.Column("assigned_by", sa.Integer(), nullable=True),
    )
    op.add_column(
        "user_programs",
        sa.Column("assigned_at", sa.DateTime(), nullable=True),
    )
    op.create_foreign_key(
        "fk_user_programs_assigned_by",
        "user_programs",
        "users",
        ["assigned_by"],
        ["id"],
        ondelete="SET NULL",
    )

    op.add_column(
        "user_task_progress",
        sa.Column("submitted_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "user_task_progress",
        sa.Column("completed_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "user_material_progress",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("material_id", sa.Integer(), nullable=False),
        sa.Column("is_completed", sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(
            ["material_id"], ["materials.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("user_material_progress")
    op.drop_column("user_task_progress", "completed_at")
    op.drop_column("user_task_progress", "submitted_at")
    op.drop_constraint(
        "fk_user_programs_assigned_by", "user_programs", type_="foreignkey"
    )
    op.drop_column("user_programs", "assigned_at")
    op.drop_column("user_programs", "assigned_by")

    op.add_column(
        "program_items",
        sa.Column("competency_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_program_items_competency_id",
        "program_items",
        "competencies",
        ["competency_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.drop_constraint(
        "fk_program_items_task_id", "program_items", type_="foreignkey"
    )
    op.drop_constraint(
        "fk_program_items_material_id", "program_items", type_="foreignkey"
    )
    op.drop_column("program_items", "task_id")
    op.drop_column("program_items", "material_id")
    op.alter_column(
        "program_items",
        "position",
        existing_type=sa.Integer(),
        new_column_name="order_index",
    )
