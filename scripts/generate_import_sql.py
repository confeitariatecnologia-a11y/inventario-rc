from __future__ import annotations

from decimal import Decimal, InvalidOperation
from pathlib import Path
import re

import openpyxl


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "Imobilizado Richesse.xlsx"
OUTPUT = ROOT / "supabase" / "import_imobilizado_richesse.sql"

LOCATION_ALIASES = {
    "TO GO": "Togo",
    "OESTE": "Oeste",
    "FLAMBOYANT": "Flamboyant",
    "BRASILIA": "Brasília",
    "BRASÍLIA": "Brasília",
    "PRIME": "Prime",
    "MARISTA": "Marista",
    "GYN SHOPPING": "Goiânia Shopping",
    "GOIÂNIA SHOPPING": "Goiania Shopping",
    "GOIANIA SHOPPING": "Goiânia Shopping",
    "GELATERIA": "Gelateria",
}

CATEGORY_COLORS = {
    "MOVEIS E UTENSILIOS": "#64748b",
    "MAQUINAS E EQUIPAMENTOS": "#f59e0b",
    "COMPUTADORES E PERIFERICOS": "#2563eb",
    "VEICULOS": "#ef4444",
}

CATEGORY_ICONS = {
    "MOVEIS E UTENSILIOS": "Armchair",
    "MAQUINAS E EQUIPAMENTOS": "Cog",
    "COMPUTADORES E PERIFERICOS": "Monitor",
    "VEICULOS": "Truck",
}


def normalize(value: object) -> str:
    text = "" if value is None else str(value).strip()
    replacements = str.maketrans(
        "ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç",
        "AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc",
    )
    return re.sub(r"\s+", " ", text.translate(replacements)).upper()


def display_title(value: object) -> str:
    text = "" if value is None else str(value).strip()
    text = re.sub(r"\s+", " ", text)
    return text.title().replace(" E ", " e ")


def sql_string(value: object) -> str:
    if value is None:
        return "null"
    text = str(value).strip()
    if not text:
        return "null"
    return "'" + text.replace("'", "''") + "'"


def sql_numeric(value: object) -> str:
    if value is None or str(value).strip() == "":
        return "null"
    try:
        number = Decimal(str(value).replace(",", "."))
    except InvalidOperation:
        return "null"
    if number < 0:
        return "null"
    return format(number, "f")


def asset_code(row_id: object) -> str:
    digits = re.sub(r"\D+", "", str(row_id or ""))
    if not digits:
        raise ValueError(f"ID invalido para asset_code: {row_id!r}")
    return f"PAT-{int(digits):04d}"


def main() -> None:
    workbook = openpyxl.load_workbook(SOURCE, data_only=True)
    sheet = workbook["Analítico"]
    headers = [cell.value for cell in sheet[1]]

    rows: list[dict[str, object]] = []
    categories: dict[str, str] = {}
    locations: dict[str, str] = {}

    for excel_row, values in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
        item = dict(zip(headers, values))
        if not any(item.get(key) is not None for key in ("ID", "GRUPO", "PLAQUETA", "DESCRIÇÃO", "LOJA")):
            continue

        group_raw = item.get("GRUPO")
        location_raw = item.get("LOJA")
        group_key = normalize(group_raw)
        location_key = normalize(location_raw)

        category_name = display_title(group_raw)
        location_name = LOCATION_ALIASES.get(location_key, display_title(location_raw))

        categories[group_key] = category_name
        locations[location_key] = location_name

        notes_parts = [
            f"Importado da planilha Imobilizado Richesse.xlsx, linha {excel_row}.",
            f"Plaqueta original: {item.get('PLAQUETA')}.",
            f"Grupo original: {str(group_raw).strip()}.",
        ]
        obs = item.get("OBS")
        if obs is not None and str(obs).strip():
            notes_parts.append(f"OBS: {str(obs).strip()}")

        rows.append(
            {
                "asset_code": asset_code(item.get("ID")),
                "name": str(item.get("DESCRIÇÃO") or "").strip()[:200],
                "plaqueta": str(item.get("PLAQUETA") or "").strip()[:100],
                "category_name": category_name,
                "location_name": location_name,
                "value": item.get("VLR. ESTIMADO"),
                "notes": " ".join(notes_parts)[:2000],
            }
        )

    lines: list[str] = [
        "-- Importacao gerada a partir de Imobilizado Richesse.xlsx.",
        "-- Rode este arquivo no SQL Editor do Supabase depois das migrations.",
        "-- Seguro para rodar novamente: usa upsert por asset_code.",
        "",
        "begin;",
        "",
        "insert into locations (name, type, address)",
    ]

    location_values = sorted(set(locations.values()))
    lines.extend(
        [
            f"select {sql_string(name)}, 'loja', null"
            f" where not exists (select 1 from locations where name = {sql_string(name)})"
            f"{' union all' if i < len(location_values) - 1 else ';'}"
            for i, name in enumerate(location_values)
        ]
    )
    lines.append("")
    lines.append("insert into categories (name, icon, color)")

    category_values = sorted(set(categories.values()))
    lines.extend(
        [
            (
                f"select {sql_string(name)}, "
                f"{sql_string(CATEGORY_ICONS.get(normalize(name), 'Package'))}, "
                f"{sql_string(CATEGORY_COLORS.get(normalize(name), '#64748b'))}"
                f" where not exists (select 1 from categories where name = {sql_string(name)})"
                f"{' union all' if i < len(category_values) - 1 else ';'}"
            )
            for i, name in enumerate(category_values)
        ]
    )
    lines.append("")
    lines.append(
        "create temp table import_imobilizado_richesse ("
        "asset_code text, name text, serial_number text, category_name text, "
        "location_name text, acquisition_value numeric, notes text"
        ") on commit drop;"
    )
    lines.append("")
    lines.append("insert into import_imobilizado_richesse values")

    for i, row in enumerate(rows):
        comma = "," if i < len(rows) - 1 else ";"
        lines.append(
            "  ("
            f"{sql_string(row['asset_code'])}, "
            f"{sql_string(row['name'])}, "
            f"{sql_string(row['plaqueta'])}, "
            f"{sql_string(row['category_name'])}, "
            f"{sql_string(row['location_name'])}, "
            f"{sql_numeric(row['value'])}, "
            f"{sql_string(row['notes'])}"
            f"){comma}"
        )

    lines.extend(
        [
            "",
            "insert into assets (",
            "  asset_code, name, serial_number, category_id, location_id, status,",
            "  acquisition_value, notes, qr_code, updated_at",
            ")",
            "select",
            "  i.asset_code,",
            "  i.name,",
            "  nullif(i.serial_number, ''),",
            "  c.id,",
            "  l.id,",
            "  'operacional',",
            "  i.acquisition_value,",
            "  i.notes,",
            "  i.asset_code,",
            "  now()",
            "from import_imobilizado_richesse i",
            "left join categories c on c.name = i.category_name",
            "left join locations l on l.name = i.location_name",
            "on conflict (asset_code) do update set",
            "  name = excluded.name,",
            "  serial_number = excluded.serial_number,",
            "  category_id = excluded.category_id,",
            "  location_id = excluded.location_id,",
            "  acquisition_value = excluded.acquisition_value,",
            "  notes = excluded.notes,",
            "  qr_code = excluded.qr_code,",
            "  updated_at = now();",
            "",
            "commit;",
            "",
            "-- Conferencia rapida apos importar:",
            "-- select count(*) as total_assets from assets;",
            "-- select l.name as unidade, count(*) from assets a left join locations l on l.id = a.location_id group by l.name order by l.name;",
            "-- select c.name as categoria, count(*) from assets a left join categories c on c.id = a.category_id group by c.name order by c.name;",
        ]
    )

    OUTPUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"SQL gerado em: {OUTPUT}")
    print(f"Patrimonios: {len(rows)}")
    print("Unidades:", ", ".join(location_values))
    print("Categorias:", ", ".join(category_values))


if __name__ == "__main__":
    main()
