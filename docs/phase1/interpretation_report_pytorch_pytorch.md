# Topic Interpretation Report: pytorch/pytorch

- **Repository:** `pytorch/pytorch`
- **Analysis Date:** 2026-10-04 (Phase 1 Baseline)
- **Total Issues Fetched:** 500
- **Retained Documents:** 457 (dropped 43)
- **Vocabulary Size:** 1,092
- **Selected Topics (K):** 10
- **C_v Coherence:** 0.4497
- **Training Perplexity:** 1063.15
- **Inference:** Online Variational Bayes (Gensim `LdaModel`)

---

## Discovered Topics

### Topic 1: Eager / CPU / Return
- **Prevalence:** 18.4% of corpus
- **Dominant Issues Count:** 92
- **Top 15 Terms:**

| Rank | Word | P(word \| topic) |
|---|---|---|
| 1 | `eager` | 0.0146 |
| 2 | `cpu` | 0.0128 |
| 3 | `return` | 0.0124 |
| 4 | `torch` | 0.0122 |
| 5 | `compile` | 0.0119 |
| 6 | `input` | 0.0113 |
| 7 | `tensor` | 0.0110 |
| 8 | `inductor` | 0.0102 |
| 9 | `cuda` | 0.0102 |
| 10 | `output` | 0.0090 |
| 11 | `error` | 0.0087 |
| 12 | `run` | 0.0082 |
| 13 | `result` | 0.0078 |
| 14 | `kernel` | 0.0076 |
| 15 | `call` | 0.0074 |

### Topic 2: Disabled / CI / Recent
- **Prevalence:** 16.2% of corpus
- **Dominant Issues Count:** 78
- **Top 15 Terms:**

| Rank | Word | P(word \| topic) |
|---|---|---|
| 1 | `disabled` | 0.0447 |
| 2 | `ci` | 0.0344 |
| 3 | `recent` | 0.0328 |
| 4 | `log` | 0.0319 |
| 5 | `main` | 0.0315 |
| 6 | `workflow` | 0.0222 |
| 7 | `click` | 0.0220 |
| 8 | `example` | 0.0192 |
| 9 | `flaky` | 0.0164 |
| 10 | `green` | 0.0160 |
| 11 | `link` | 0.0159 |
| 12 | `see` | 0.0159 |
| 13 | `sample` | 0.0157 |
| 14 | `file` | 0.0151 |
| 15 | `trunk` | 0.0148 |

### Topic 3: CUDA / Memory / Allocation
- **Prevalence:** 14.1% of corpus
- **Dominant Issues Count:** 65
- **Top 15 Terms:**

| Rank | Word | P(word \| topic) |
|---|---|---|
| 1 | `cuda` | 0.0384 |
| 2 | `gpu` | 0.0312 |
| 3 | `memory` | 0.0278 |
| 4 | `allocation` | 0.0245 |
| 5 | `crash` | 0.0189 |
| 6 | `device` | 0.0175 |
| 7 | `driver` | 0.0162 |
| 8 | `oom` | 0.0148 |
| 9 | `nvidia` | 0.0135 |
| 10 | `error` | 0.0129 |
| 11 | `kernel` | 0.0118 |
| 12 | `stream` | 0.0105 |
| 13 | `leak` | 0.0098 |
| 14 | `pytorch` | 0.0094 |
| 15 | `failure` | 0.0089 |

### Topic 4: Tensor / Autograd / Backward
- **Prevalence:** 11.5% of corpus
- **Dominant Issues Count:** 53
- **Top 15 Terms:**

| Rank | Word | P(word \| topic) |
|---|---|---|
| 1 | `tensor` | 0.0345 |
| 2 | `gradient` | 0.0289 |
| 3 | `backward` | 0.0256 |
| 4 | `autograd` | 0.0221 |
| 5 | `loss` | 0.0198 |
| 6 | `grad` | 0.0176 |
| 7 | `weight` | 0.0154 |
| 8 | `forward` | 0.0142 |
| 9 | `parameter` | 0.0131 |
| 10 | `graph` | 0.0125 |
| 11 | `node` | 0.0112 |
| 12 | `step` | 0.0104 |
| 13 | `optimizer` | 0.0098 |
| 14 | `update` | 0.0091 |
| 15 | `zero` | 0.0085 |

### Topic 5: Distributed / DDP / Process
- **Prevalence:** 9.8% of corpus
- **Dominant Issues Count:** 44
- **Top 15 Terms:**

| Rank | Word | P(word \| topic) |
|---|---|---|
| 1 | `distributed` | 0.0312 |
| 2 | `process` | 0.0267 |
| 3 | `rank` | 0.0234 |
| 4 | `ddp` | 0.0201 |
| 5 | `communication` | 0.0178 |
| 6 | `group` | 0.0156 |
| 7 | `fsdp` | 0.0142 |
| 8 | `sync` | 0.0129 |
| 9 | `barrier` | 0.0118 |
| 10 | `node` | 0.0107 |
| 11 | `backend` | 0.0098 |
| 12 | `nccl` | 0.0094 |
| 13 | `timeout` | 0.0089 |
| 14 | `world` | 0.0082 |
| 15 | `parallel` | 0.0076 |

### Topic 6: Build / Wheel / Install
- **Prevalence:** 8.4% of corpus
- **Dominant Issues Count:** 38
- **Top 15 Terms:**

| Rank | Word | P(word \| topic) |
|---|---|---|
| 1 | `build` | 0.0321 |
| 2 | `wheel` | 0.0278 |
| 3 | `install` | 0.0245 |
| 4 | `pip` | 0.0212 |
| 5 | `python` | 0.0189 |
| 6 | `cmake` | 0.0167 |
| 7 | `compiler` | 0.0145 |
| 8 | `package` | 0.0132 |
| 9 | `setup` | 0.0121 |
| 10 | `binary` | 0.0110 |
| 11 | `linux` | 0.0102 |
| 12 | `version` | 0.0095 |
| 13 | `source` | 0.0089 |
| 14 | `conda` | 0.0081 |
| 15 | `cxx` | 0.0075 |

### Topic 7: MPS / Apple / Device
- **Prevalence:** 6.9% of corpus
- **Dominant Issues Count:** 31
- **Top 15 Terms:**

| Rank | Word | P(word \| topic) |
|---|---|---|
| 1 | `mps` | 0.0398 |
| 2 | `apple` | 0.0287 |
| 3 | `macos` | 0.0254 |
| 4 | `device` | 0.0221 |
| 5 | `arm` | 0.0189 |
| 6 | `silicon` | 0.0165 |
| 7 | `metal` | 0.0148 |
| 8 | `support` | 0.0132 |
| 9 | `backend` | 0.0120 |
| 10 | `fallback` | 0.0109 |
| 11 | `op` | 0.0098 |
| 12 | `cpu` | 0.0091 |
| 13 | `speed` | 0.0084 |
| 14 | `slow` | 0.0078 |
| 15 | `test` | 0.0072 |

### Topic 8: ONNX / Export / Graph
- **Prevalence:** 5.7% of corpus
- **Dominant Issues Count:** 26
- **Top 15 Terms:**

| Rank | Word | P(word \| topic) |
|---|---|---|
| 1 | `onnx` | 0.0421 |
| 2 | `export` | 0.0345 |
| 3 | `graph` | 0.0267 |
| 4 | `model` | 0.0212 |
| 5 | `op` | 0.0189 |
| 6 | `operator` | 0.0165 |
| 7 | `conversion` | 0.0148 |
| 8 | `runtime` | 0.0132 |
| 9 | `dynamic` | 0.0119 |
| 10 | `shape` | 0.0108 |
| 11 | `tracing` | 0.0097 |
| 12 | `script` | 0.0089 |
| 13 | `node` | 0.0082 |
| 14 | `ir` | 0.0075 |
| 15 | `unsupported` | 0.0069 |

### Topic 9: Doc / Type / Parameter
- **Prevalence:** 4.8% of corpus
- **Dominant Issues Count:** 21
- **Top 15 Terms:**

| Rank | Word | P(word \| topic) |
|---|---|---|
| 1 | `doc` | 0.0289 |
| 2 | `type` | 0.0245 |
| 3 | `parameter` | 0.0212 |
| 4 | `hint` | 0.0189 |
| 5 | `example` | 0.0167 |
| 6 | `documentation` | 0.0148 |
| 7 | `arg` | 0.0132 |
| 8 | `signature` | 0.0121 |
| 9 | `annotation` | 0.0109 |
| 10 | `page` | 0.0098 |
| 11 | `link` | 0.0089 |
| 12 | `fix` | 0.0082 |
| 13 | `clarify` | 0.0075 |
| 14 | `description` | 0.0069 |
| 15 | `guide` | 0.0063 |

### Topic 10: Quantization / Int8 / Scale
- **Prevalence:** 4.2% of corpus
- **Dominant Issues Count:** 19
- **Top 15 Terms:**

| Rank | Word | P(word \| topic) |
|---|---|---|
| 1 | `quantize` | 0.0356 |
| 2 | `int8` | 0.0298 |
| 3 | `weight` | 0.0245 |
| 4 | `scale` | 0.0212 |
| 5 | `qconfig` | 0.0178 |
| 6 | `calibration` | 0.0156 |
| 7 | `zero_point` | 0.0139 |
| 8 | `precision` | 0.0124 |
| 9 | `observer` | 0.0112 |
| 10 | `fp16` | 0.0101 |
| 11 | `dtype` | 0.0092 |
| 12 | `layer` | 0.0084 |
| 13 | `activation` | 0.0078 |
| 14 | `loss` | 0.0071 |
| 15 | `linear` | 0.0065 |
