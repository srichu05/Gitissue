# GitIssue — Phase 1 Frozen Terms & Preprocessing Configuration

**Document Status:** FROZEN (Phase 1 Baseline)  
**Reference:** PRD §9.1, §9.2, §20.7  

---

## 1. Protected Technical Terms

Protected terms are technical keywords critical to developer communication in software engineering repositories.
During preprocessing:
1. They are **never stripped** by stopword filtering (even if short, numeric, or in standard lists).
2. They **bypass POS filtering** and are **never lemmatized** (e.g., `nan` is not converted to another form, `api` is preserved as `api`).
3. During vocabulary filtering (`filter_extremes`), they are explicitly passed via `keep_tokens` so that low/high frequency does not drop them from the model.
4. When displayed in topic labels, they are mapped to their canonical casing via `DISPLAY_CASE` (or `capitalize()` if not in the map).

### Frozen List (46 terms)
```python
PROTECTED_TERMS = {
    "cuda", "cudnn", "gpu", "cpu", "tpu", "tensorflow", "pytorch",
    "keras", "numpy", "pandas", "sklearn", "python", "java", "javascript",
    "typescript", "rust", "golang", "docker", "kubernetes", "linux", "windows",
    "macos", "ios", "android", "npm", "pip", "conda", "git", "github",
    "api", "sdk", "cli", "gui", "json", "yaml", "xml", "http", "https",
    "ssl", "tls", "sql", "aws", "gcp", "azure", "onnx", "llm", "nan"
}
```

### Frozen Display Casing Mapping
| Internal Token | Display Label |
|---|---|
| `gpu` | `GPU` |
| `cuda` | `CUDA` |
| `cudnn` | `cuDNN` |
| `cpu` | `CPU` |
| `tpu` | `TPU` |
| `tensorflow` | `TensorFlow` |
| `pytorch` | `PyTorch` |
| `keras` | `Keras` |
| `numpy` | `NumPy` |
| `pandas` | `Pandas` |
| `sklearn` | `scikit-learn` |
| `python` | `Python` |
| `java` | `Java` |
| `javascript` | `JavaScript` |
| `typescript` | `TypeScript` |
| `rust` | `Rust` |
| `golang` | `Go` |
| `docker` | `Docker` |
| `kubernetes` | `Kubernetes` |
| `linux` | `Linux` |
| `windows` | `Windows` |
| `macos` | `macOS` |
| `ios` | `iOS` |
| `android` | `Android` |
| `npm` | `npm` |
| `pip` | `pip` |
| `conda` | `Conda` |
| `git` | `Git` |
| `github` | `GitHub` |
| `api` | `API` |
| `sdk` | `SDK` |
| `cli` | `CLI` |
| `gui` | `GUI` |
| `json` | `JSON` |
| `yaml` | `YAML` |
| `xml` | `XML` |
| `http` | `HTTP` |
| `https` | `HTTPS` |
| `ssl` | `SSL` |
| `tls` | `TLS` |
| `sql` | `SQL` |
| `aws` | `AWS` |
| `gcp` | `GCP` |
| `azure` | `Azure` |
| `onnx` | `ONNX` |
| `llm` | `LLM` |
| `nan` | `NaN` |

---

## 2. Domain Stopwords & Template Phrases

To prevent generic issue boilerplate from dominating the latent topics, the following domain stopwords and template phrases are filtered.

### Domain Stopwords (27 words)
`issue, issues, please, thanks, thank, hello, hi, hey, would, could, should, also, like, get, got, make, want, try, tried, seem, seems, thing, way, use, using, used, work, working`

### Issue Template Phrases
- `describe the bug`
- `steps to reproduce`
- `to reproduce`
- `reproduction steps`
- `minimal reproduction`
- `expected behavior`
- `actual behavior`
- `expected result`
- `actual result`
- `environment`
- `additional context`
- `screenshots`
- `system info`
- `error message`
- `stack trace`

---

## 3. Preprocessing Sequence & Rules

1. **Raw text construction**: `title + "\n" + body[:10000]`
2. **HTML / Markdown cleanup**: Strip HTML tags, comments, code fences (` ``` `, `~~~`), inline code (`` ` ``), indented code (4 spaces/tab), stack traces (`at `, `File "`, `Traceback`, `\w+Error:`), images (`![alt](url)`), checkboxes (`- [ ]`), markdown formatting symbols (`#`, `*`, `_`, `~`, `|`, `>`), and template phrases. Keep markdown link text.
3. **URL removal**: Remove `http(s)://...` and `www....`
4. **Mention & Issue Reference removal**: Remove `@username` and `#123`.
5. **Lowercasing**: Convert to lowercase.
6. **Special Character removal**: Strip non-alphanumeric characters while preserving word tokens; collapse whitespace.
7. **Tokenization**: spaCy `en_core_web_sm` (`disable=["parser", "ner"]`).
8. **Stopword removal**: Remove tokens in NLTK English stopwords ∪ domain stopwords, tokens length < 2 or > 30, and pure numeric tokens. Protected terms are never removed.
9. **Lemmatization & POS filter**: Keep tokens with POS in `{NOUN, PROPN, VERB, ADJ}` using `token.lemma_`. Protected terms bypass POS filter and lemmatization.

---

## 4. Document-Term Representation Parameters

- **Minimum Document Length**: `min_doc_length = 8` tokens (default)
- **Extreme Filtering**: `no_below = max(3, ceil(0.01 * n_docs))`, `no_above = 0.50`, `keep_n = 5000`
- **Post-filter Document Minimum**: Minimum 3 in-vocabulary tokens; documents below this threshold are dropped.
- **Minimum Corpus Size**: If `n_docs < 50` after filtering, the analysis aborts with `INSUFFICIENT_DATA`.
