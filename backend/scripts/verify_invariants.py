import json
import sys
import os
sys.path.insert(0, os.path.abspath("."))
from backend.database.database import SessionLocal
from backend.database.models import Analysis, Repository, Issue, Topic, TopicWord, IssueTopicDistribution

session = SessionLocal()

analyses = session.query(Analysis).filter(Analysis.status == "COMPLETED").all()
print(f"Found {len(analyses)} completed analysis/analyses:")
for a in analyses:
    repo_name = a.repository.full_name if a.repository else "Unknown"
    print(f"  Analysis ID: {a.id}")
    print(f"  Repository: {repo_name}")
    print(f"  Config: {a.config}")
    print(f"  K: {a.num_topics}, Coherence: {a.coherence_cv}, Perplexity: {a.perplexity}, Vocab: {a.vocab_size}, Retained Docs: {a.num_documents}")

if not analyses:
    session.close()
    exit(0)

target = analyses[0]
target_id = target.id
print("\n" + "="*60)
print(f"VERIFYING MATHEMATICAL INVARIANTS FOR {target_id}")
print("="*60)

# 1. Document-Topic Distributions
distributions = session.query(IssueTopicDistribution).filter(IssueTopicDistribution.analysis_id == target_id).all()
issue_dist_map = {}
for d in distributions:
    if d.issue_id not in issue_dist_map:
        issue_dist_map[d.issue_id] = []
    issue_dist_map[d.issue_id].append(d.probability)

print(f"\n1. Document-Topic Distributions (Total retained issues with distributions: {len(issue_dist_map)})")
sum_errors = []
min_sum = 100.0
max_sum = 0.0
for iss_id, probs in issue_dist_map.items():
    s = sum(probs)
    min_sum = min(min_sum, s)
    max_sum = max(max_sum, s)
    if abs(s - 1.0) > 1e-4:
        sum_errors.append((iss_id, s))

print(f"  Min document topic sum: {min_sum:.6f}")
print(f"  Max document topic sum: {max_sum:.6f}")
if not sum_errors:
    print(f"  [PASS] All {len(issue_dist_map)} retained documents have topic distributions summing strictly to 1.0000 (tolerance 1e-4).")
else:
    print(f"  [FAIL] Found {len(sum_errors)} documents where distribution does not sum to 1:")
    for iss_id, s in sum_errors[:5]:
        print(f"    Issue {iss_id}: sum = {s}")

# 2. Dominant Issue Counts
topics = session.query(Topic).filter(Topic.analysis_id == target_id).order_by(Topic.topic_index).all()
total_dominant = sum(t.dominant_issue_count for t in topics)
print(f"\n2. Dominant Issue Counts (Total topics: {len(topics)})")
print(f"  Sum of dominant issue counts: {total_dominant}")
print(f"  Total retained documents: {len(issue_dist_map)}")
for t in topics:
    label = t.human_label or t.auto_label
    print(f"    Topic {t.topic_index} ({label}): dominant_issue_count = {t.dominant_issue_count}")

if total_dominant == len(issue_dist_map):
    print("  [PASS] Dominant issue counts exactly equal number of retained documents.")
else:
    print(f"  [FAIL] Mismatch: {total_dominant} vs {len(issue_dist_map)}")

# 3. Topic Prevalence Verification
print("\n3. Topic Prevalence Verification")
topic_id_to_index = {t.id: t.topic_index for t in topics}
K = len(topics)
empirical_prevalence = [0.0] * K

for d in distributions:
    idx = topic_id_to_index.get(d.topic_id)
    if idx is not None:
        empirical_prevalence[idx] += d.probability

for k_idx in range(K):
    empirical_prevalence[k_idx] /= len(issue_dist_map)

prev_diffs = []
for t in topics:
    idx = t.topic_index
    stored_prev = t.prevalence
    calc_prev = empirical_prevalence[idx]
    diff = abs(stored_prev - calc_prev)
    prev_diffs.append(diff)
    label = t.human_label or t.auto_label
    print(f"  Topic {idx} ({label}): Stored Prevalence={stored_prev:.4f}, Mean Posterior={calc_prev:.4f}, Diff={diff:.6f}")

print(f"  Sum of stored prevalence across topics: {sum(t.prevalence for t in topics):.4f}")
if max(prev_diffs) < 1e-3:
    print(f"  [PASS] Topic prevalence matches empirical mean topic mixture across corpus (max diff: {max(prev_diffs):.6f}).")
else:
    print(f"  [WARNING] Max difference between stored and empirical prevalence: {max(prev_diffs):.6f}")

# 4. Representative Issue Probabilities
print("\n4. Representative Issue Probabilities Inspection")
for t in topics:
    # Query top distributions for this topic
    top_dists = (
        session.query(IssueTopicDistribution)
        .filter(IssueTopicDistribution.topic_id == t.id)
        .order_by(IssueTopicDistribution.probability.desc())
        .limit(5)
        .all()
    )
    probs = [d.probability for d in top_dists]
    sample_probs = [f"{p:.4f} ({p*100:.1f}%)" for p in probs[:3]]
    min_p = min(probs) if probs else 0
    max_p = max(probs) if probs else 0
    label = t.human_label or t.auto_label
    print(f"  Topic {t.topic_index} ({label}): Top 3: {sample_probs}. Min top-5 P={min_p:.4f}, Max top-5 P={max_p:.4f}")

# 5. Evaluation sweep results vs selected K
print("\n5. Model Evaluation Sweep Results")
eval_data = target.evaluation_results
if isinstance(eval_data, list):
    eval_results = eval_data
    k_mode = target.config.get("k_mode", "auto") if target.config else "auto"
    crit = "c_v_coherence"
    sel_k = target.num_topics
    highest_cv_item = max(eval_results, key=lambda x: x["coherence_cv"]) if eval_results else None
    best_k = highest_cv_item["k"] if highest_cv_item else None
elif isinstance(eval_data, dict):
    k_mode = eval_data.get("k_mode", "auto")
    crit = eval_data.get("criterion", "c_v_coherence")
    sel_k = eval_data.get("selected_k", target.num_topics)
    best_k = eval_data.get("best_k_by_coherence")
    eval_results = eval_data.get("results", [])
else:
    eval_results = []
    k_mode, crit, sel_k, best_k = "auto", "c_v_coherence", target.num_topics, None

print(f"  Configured Mode: {k_mode}")
print(f"  Criterion: {crit}")
print(f"  Selected K: {sel_k}")
print(f"  Best K by Coherence: {best_k}")
print("  Sweep points:")
for r in eval_results:
    k_val = r.get("k")
    cv_val = r.get("coherence_cv")
    perp_val = r.get("perplexity")
    mark = " (SELECTED)" if k_val == sel_k else (" (SWEEP BEST)" if k_val == best_k else "")
    print(f"    K={k_val}: C_v={cv_val:.4f}, Perplexity={perp_val:.1f}{mark}")

if best_k and eval_results:
    highest_cv_item = max(eval_results, key=lambda x: x["coherence_cv"])
    if highest_cv_item["k"] == best_k:
        print(f"  [PASS] best_k ({best_k}) correctly identifies candidate with highest C_v ({highest_cv_item['coherence_cv']:.4f}).")
    else:
        print(f"  [FAIL] best_k is {best_k} but highest C_v is K={highest_cv_item['k']} ({highest_cv_item['coherence_cv']:.4f}).")

session.close()
