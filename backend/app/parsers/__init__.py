"""Parsing utilities for ML results."""

from .job_results import parse_job_xlsx

# Backwards-compatible alias
parse_xlsx = parse_job_xlsx

__all__ = ["parse_job_xlsx", "parse_xlsx"]
