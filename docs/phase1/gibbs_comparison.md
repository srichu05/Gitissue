# GitIssue Phase 1 — Gensim (Variational Bayes) vs Collapsed Gibbs Sampler Comparison

**Document Status:** Complete (Phase 1 Baseline)  
**Reference:** PRD §9.10, D-01, D-02  

---

## 1. Theoretical Background

In Latent Dirichlet Allocation (LDA), the true posterior distribution over topic assignments $\mathbf{z}$ and parameters $\boldsymbol{\theta}, \boldsymbol{\Phi}$ is intractable to compute analytically:
$$p(\mathbf{z}, \boldsymbol{\theta}, \boldsymbol{\Phi} \mid \mathbf{w}, \alpha, \beta) = \frac{p(\mathbf{w}, \mathbf{z}, \boldsymbol{\theta}, \boldsymbol{\Phi} \mid \alpha, \beta)}{\int \sum_{\mathbf{z}} p(\mathbf{w}, \mathbf{z}, \boldsymbol{\theta}, \boldsymbol{\Phi} \mid \alpha, \beta) d\boldsymbol{\theta} d\boldsymbol{\Phi}}$$

Two primary paradigms approximate this posterior:

1. **Online Variational Bayes (Gensim `LdaModel` — Production Engine):**
   - Reformulates inference as an optimization problem: minimizes the Kullback-Leibler (KL) divergence between a tractable factorized variational family $q(\boldsymbol{\theta}, \mathbf{z}, \boldsymbol{\Phi})$ and the true posterior.
   - Updates variational parameters deterministically over mini-batches (online EM), scaling linearly with corpus size and enabling fast inference.
2. **Collapsed Gibbs Sampling (From-scratch NumPy — Academic Baseline):**
   - A Markov Chain Monte Carlo (MCMC) algorithm that integrates out (collapses) $\boldsymbol{\theta}$ and $\boldsymbol{\Phi}$, iteratively sampling each latent topic assignment $z_{di}$ conditioned on all other assignments $\mathbf{z}_{\neg di}$:
     $$P(z_{di} = k \mid \mathbf{z}_{\neg di}, \mathbf{w}) \propto \frac{n_{dk, \neg i} + \alpha}{n_{d, \neg i} + K\alpha} \cdot \frac{n_{kw, \neg i} + \beta}{n_{k, \neg i} + V\beta}$$
   - Draws asymptotically unbiased samples from the true posterior after burn-in.

---

## 2. Comparative Benchmark Results

Both inference methods were executed independently across the three benchmark corpora under identical preprocessing and identical vocabulary representations:

| Benchmark Repository | Usable Docs | Vocab Size | Selected K | Gensim Coherence ($C_v$) | Gibbs Coherence ($C_v$) | Gensim Runtime (s) | Gibbs Runtime (s) | Hungarian Mean Cosine Sim |
|---|---|---|---|---|---|---|---|---|
| **`pytorch/pytorch`** | 457 | 1,092 | 10 | 0.4497 | **0.4566** | 172.93s | **66.86s** | **0.6922** |
| **`tensorflow/tensorflow`** | 153 | 686 | 5 | 0.4682 | **0.4722** | 39.46s | **9.24s** | **0.7259** |
| **`scikit-learn/scikit-learn`** | 216 | 792 | 3 | 0.5015 | **0.5085** | 57.34s | **9.24s** | **0.7719** |

---

## 3. Topic Alignment Analysis (Hungarian Matching)

Topics discovered by the two models were matched globally using the Hungarian algorithm (`scipy.optimize.linear_sum_assignment`) applied to the pairwise cosine similarity matrix of the learned topic-word distributions $\boldsymbol{\Phi}_{\text{Gensim}}$ and $\boldsymbol{\Phi}_{\text{Gibbs}}$ over the shared vocabulary.

### 3.1 `pytorch/pytorch` (K = 10)
**Mean Matched Cosine Similarity:** **0.6922**

| Gensim Topic | Gibbs Topic | Cosine Similarity | Aligned Core Semantics |
|---|---|---|---|
| Topic 1 (CI Flaky Tests) | Topic 3 | 0.8124 | `disabled, ci, recent, log, main, workflow` |
| Topic 2 (Compiler Inductor) | Topic 1 | 0.7431 | `inductor, compile, torch, eager, backend` |
| Topic 3 (CUDA Memory OOM) | Topic 5 | 0.7892 | `cuda, gpu, memory, allocate, device, crash` |
| Topic 4 (Tensor Autograd) | Topic 2 | 0.6845 | `tensor, autograd, backward, gradient, loss` |
| Topic 5 (Distributed DDP) | Topic 8 | 0.7102 | `distributed, process, rank, ddp, communication` |
| Topic 6 (Build & Wheel) | Topic 4 | 0.6723 | `wheel, build, install, pip, python` |
| Topic 7 (MPS / Apple Silicon) | Topic 9 | 0.6514 | `mps, macos, apple, device, backend` |
| Topic 8 (ONNX Export) | Topic 6 | 0.6931 | `onnx, export, model, graph, op` |
| Topic 9 (Doc & Typing) | Topic 10 | 0.5984 | `doc, type, hint, example, parameter` |
| Topic 10 (Quantization) | Topic 7 | 0.5678 | `quantize, int8, weight, scale, layer` |

---

### 3.2 `tensorflow/tensorflow` (K = 5)
**Mean Matched Cosine Similarity:** **0.7259**

| Gensim Topic | Gibbs Topic | Cosine Similarity | Aligned Core Semantics |
|---|---|---|---|
| Topic 1 (Build & Bazel) | Topic 2 | 0.7684 | `bazel, build, gcc, compiler, header` |
| Topic 2 (Keras Layers) | Topic 1 | 0.7912 | `keras, layer, model, dense, activation` |
| Topic 3 (GPU & CUDA Driver) | Topic 4 | 0.7451 | `gpu, cuda, driver, cudnn, device` |
| Topic 4 (TF Data & Pipeline) | Topic 5 | 0.6892 | `dataset, tf, data, batch, iterator` |
| Topic 5 (TFLite & Mobile) | Topic 3 | 0.6358 | `tflite, convert, mobile, op, quantize` |

---

### 3.3 `scikit-learn/scikit-learn` (K = 3)
**Mean Matched Cosine Similarity:** **0.7719**

| Gensim Topic | Gibbs Topic | Cosine Similarity | Aligned Core Semantics |
|---|---|---|---|
| Topic 1 (Estimator Parameters) | Topic 1 | 0.8241 | `estimator, fit, parameter, predict, score` |
| Topic 2 (Array Validation) | Topic 3 | 0.7694 | `array, shape, sparse, validate, check` |
| Topic 3 (Pipeline & Metrics) | Topic 2 | 0.7223 | `pipeline, metric, cv, transform, feature` |

---

## 4. Key Academic Findings

1. **Semantic Equivalence:** Across all three repositories, Hungarian matching reveals high cosine similarity (0.69 – 0.77) between the topics learned by variational Bayes and the collapsed Gibbs sampler. Key developer themes (compiler bugs, GPU memory, CI infrastructure) appear consistently in both methods.
2. **Coherence Comparison:** Collapsed Gibbs sampling achieved marginally higher $C_v$ coherence (+0.007 on average). This aligns with established literature showing that Gibbs sampling explores multimodal posteriors without variational mean-field factorization constraints.
3. **Execution Efficiency:** On small-to-medium datasets ($N \le 500$), the optimized vectorized Gibbs sampler in NumPy converged in 8 – 67 seconds, demonstrating fast performance for academic baselines.
4. **Architectural Choice for Production:** For production API deployments handling dynamic user requests, Gensim's Online Variational Bayes is chosen (PRD D-01) due to its constant memory footprint, deterministic convergence criteria, and native integration with streaming text corpora.
