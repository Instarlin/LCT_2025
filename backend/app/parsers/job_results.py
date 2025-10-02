from __future__ import annotations

import io
from datetime import datetime
from typing import Any, Dict, List

from openpyxl import load_workbook


def parse_job_xlsx(file_bytes: bytes) -> Dict[str, Any]:
    wb = load_workbook(io.BytesIO(file_bytes), data_only=True)

    summary = _parse_summary_sheet(wb)
    findings = _parse_sheet_rows(wb, "Findings")
    metrics = _parse_sheet_rows(wb, "Metrics")

    return {
        "parsed_at": datetime.utcnow().isoformat(),
        "summary": summary,
        "findings": findings,
        "metrics": metrics,
    }


def _parse_summary_sheet(wb) -> Dict[str, Any]:
    if "Summary" not in wb.sheetnames:
        return {}
    ws = wb["Summary"]
    summary: Dict[str, Any] = {}
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row or all(value is None for value in row):
            continue
        key = str(row[0]).strip() if row[0] else None
        value = row[1] if len(row) > 1 else None
        if key:
            summary[key] = value
    return summary


def _parse_sheet_rows(wb, sheet_name: str) -> List[Dict[str, Any]]:
    if sheet_name not in wb.sheetnames:
        return []
    ws = wb[sheet_name]
    headers = [str(cell.value).strip() for cell in next(ws.iter_rows(min_row=1, max_row=1))]

    rows: List[Dict[str, Any]] = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row or all(value is None for value in row):
            continue
        record = {}
        for header, value in zip(headers, row):
            record[header] = value
        rows.append(record)
    return rows
