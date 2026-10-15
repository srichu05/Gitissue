import httpx

aid = "34522e53-26d8-4f2e-9b55-b05247039d84"
headers = {"Authorization": "Bearer test_token_dev_user"}
base_url = f"http://127.0.0.1:8000/api/analyses/{aid}/export"

export_types = ["report_md", "report_json", "topic_words_csv", "doc_topics_csv"]

print("VERIFYING EXPORT ENDPOINTS:")
for exp in export_types:
    url = f"{base_url}?type={exp}"
    res = httpx.get(url, headers=headers)
    print(f"  {exp}: HTTP {res.status_code}, {len(res.content)} bytes, Content-Type: {res.headers.get('content-type')}")
    if exp == "report_md":
        # Check that P=1.00 is NOT present and percentage is present
        text = res.text
        has_percentage = "%" in text
        print(f"    report_md preview (first 250 chars):\n    {text[:250].strip()}")
        print(f"    Contains percentage formatting: {has_percentage}")
    elif exp == "report_json":
        data = res.json()
        print(f"    report_json keys: {list(data.keys())}")
    elif exp == "topic_words_csv":
        lines = res.text.strip().split("\n")
        print(f"    topic_words_csv header: {lines[0]}, total rows: {len(lines)}")
    elif exp == "doc_topics_csv":
        lines = res.text.strip().split("\n")
        print(f"    doc_topics_csv header: {lines[0][:60]}..., total rows: {len(lines)}")
