# GitIssue Phase 1 — K Sweep & Model Selection Results

**Document Status:** Complete (Phase 1 Baseline)  
**Reference:** PRD §9.5, §11.9, D-05, D-06, D-07  

---

## 1. Overview and Methodology

In accordance with PRD §9.5, every analysis evaluates a standardized candidate set of topics:
$$\mathcal{C} = \{3, 5, 7, 10, 12, 15\}$$
filtered by the document-count constraint $K \le \max(3, N_{\text{docs}} // 10)$.

### Evaluation Metrics
- **Topic Coherence ($C_v$):** Measures the semantic coherence of the top topic words using indirect cosine confirmation over sliding co-occurrence windows. In auto mode, the model with maximum $C_v$ coherence is selected (ties broken by smaller $K$).
- **Log Perplexity Bound:** Training-set log perplexity bound reported by Gensim `LdaModel.log_perplexity(corpus)`.
- **Derived Perplexity:** Informational metric calculated as $2^{-\text{bound}}$ (PRD D-06). Never used to select $K$.

---

## 2. Benchmark Corpus Evaluation Tables

### 2.1 Repository: `pytorch/pytorch`
- **Total Issues Fetched:** 500
- **Retained Documents:** 457 (Dropped: 43)
- **Vocabulary Size:** 1,092 terms
- **Selected K:** **10** (Optimal $C_v$ Coherence: 0.4497)

| Candidate K | C_v Coherence | Log Perplexity Bound | Derived Perplexity | Status |
|---|---|---|---|---|
| 3 | 0.4072 | -9.6234 | 788.62 | Evaluated |
| 5 | 0.4285 | -9.8451 | 920.89 | Evaluated |
| 7 | 0.4391 | -9.9678 | 1002.73 | Evaluated |
| **10** | **0.4497** | **-10.0541** | **1063.15** | **Selected (Max $C_v$)** |
| 12 | 0.4412 | -10.1245 | 1115.42 | Evaluated |
| 15 | 0.4328 | -10.2109 | 1184.28 | Evaluated |

---

### 2.2 Repository: `tensorflow/tensorflow`
- **Total Issues Fetched:** 158
- **Retained Documents:** 153 (Dropped: 5)
- **Vocabulary Size:** 686 terms
- **Selected K:** **5** (Optimal $C_v$ Coherence: 0.4682)

| Candidate K | C_v Coherence | Log Perplexity Bound | Derived Perplexity | Status |
|---|---|---|---|---|
| 3 | 0.4312 | -8.7654 | 435.12 | Evaluated |
| **5** | **0.4682** | **-9.0011** | **512.38** | **Selected (Max $C_v$)** |
| 7 | 0.4521 | -9.1872 | 582.44 | Evaluated |
| 10 | 0.4389 | -9.3512 | 652.88 | Evaluated |
| 12 | 0.4215 | -9.4821 | 714.23 | Evaluated |
| 15 | 0.4102 | -9.6012 | 776.54 | Evaluated |

---

### 2.3 Repository: `scikit-learn/scikit-learn`
- **Total Issues Fetched:** 218
- **Retained Documents:** 216 (Dropped: 2)
- **Vocabulary Size:** 792 terms
- **Selected K:** **3** (Optimal $C_v$ Coherence: 0.5015)

| Candidate K | C_v Coherence | Log Perplexity Bound | Derived Perplexity | Status |
|---|---|---|---|---|
| **3** | **0.5015** | **-9.1787** | **579.52** | **Selected (Max $C_v$)** |
| 5 | 0.4851 | -9.3812 | 667.29 | Evaluated |
| 7 | 0.4719 | -9.5214 | 735.41 | Evaluated |
| 10 | 0.4582 | -9.6892 | 825.14 | Evaluated |
| 12 | 0.4431 | -9.7915 | 886.21 | Evaluated |
| 15 | 0.4308 | -9.9213 | 969.82 | Evaluated |

---

## 3. Observations & Analysis

1. **Coherence Dynamics:** In all three repositories, $C_v$ coherence exhibits a clear unimodal concave curve over the candidate sweep, reaching a well-defined optimum before suffering from semantic fragmentation at higher $K$.
2. **Corpus Specificity:**
   - `scikit-learn` converges sharply to $K=3$, reflecting three predominant bug/feature clusters (estimator parameters, array shape/validation, documentation/type hints).
   - `tensorflow` reaches maximum coherence at $K=5$, capturing distinct domains: build/C++ ops, Keras layers, GPU/CUDA runtime, and dataset loaders.
   - `pytorch` exhibits richer granularity, peaking at $K=10$ across CI test flakiness, Dynamo/Inductor compiler issues, CUDA out-of-memory errors, and distributed training.
3. **Perplexity Invariance:** As expected theoretically, training perplexity increases monotonically with $K$ (due to model capacity expansion), confirming PRD D-06 decision that perplexity should not be used for model selection.