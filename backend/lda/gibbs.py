"""Academic from-scratch Collapsed Gibbs Sampler in NumPy (PRD §9.10, D-02)."""
import time
from typing import List, Dict, Any, Tuple, Optional
import numpy as np


class CollapsedGibbsSampler:
    """
    From-scratch Collapsed Gibbs Sampler for Latent Dirichlet Allocation.
    Offline academic baseline for comparison against Gensim variational Bayes.
    """

    def __init__(
        self,
        num_topics: int,
        alpha: Optional[float] = None,
        beta: float = 0.01,
        num_sweeps: int = 1000,
        seed: int = 42,
    ):
        self.num_topics = num_topics
        self.K = num_topics
        # PRD §9.10: alpha = 50 / K, beta = 0.01, 1000 sweeps, seed 42
        self.alpha = (50.0 / num_topics) if alpha is None else alpha
        self.beta = beta
        self.num_sweeps = num_sweeps
        self.seed = seed

        self.phi: Optional[np.ndarray] = None  # shape (K, V)
        self.theta: Optional[np.ndarray] = None  # shape (D, K)
        self.runtime_seconds: float = 0.0

    def fit(
        self,
        corpus_words: List[List[int]],
        vocab_size: int,
        progress_cb=None,
    ) -> "CollapsedGibbsSampler":
        """
        Fit collapsed Gibbs sampler on documents represented as lists of word IDs.
        corpus_words: List of documents, each is a list of token word IDs [0 .. vocab_size-1].
        """
        start_time = time.time()
        rng = np.random.RandomState(self.seed)

        D = len(corpus_words)
        V = vocab_size
        K = self.K
        alpha = self.alpha
        beta = self.beta

        # Count matrices:
        # n_kw: topic-word counts (K x V)
        # n_k: total words per topic (K)
        # n_dk: doc-topic counts (D x K)
        # n_d: total words per doc (D)
        n_kw = np.zeros((K, V), dtype=np.int32)
        n_k = np.zeros(K, dtype=np.int32)
        n_dk = np.zeros((D, K), dtype=np.int32)
        n_d = np.array([len(doc) for doc in corpus_words], dtype=np.int32)

        # Randomly initialize topic assignments
        z: List[List[int]] = []
        for d in range(D):
            doc_z = []
            for w in corpus_words[d]:
                k_init = int(rng.randint(0, K))
                doc_z.append(k_init)
                n_kw[k_init, w] += 1
                n_k[k_init] += 1
                n_dk[d, k_init] += 1
            z.append(doc_z)

        # Precompute constants
        V_beta = V * beta

        # Run sweeps
        for sweep in range(1, self.num_sweeps + 1):
            for d in range(D):
                doc = corpus_words[d]
                doc_z = z[d]
                for i, w in enumerate(doc):
                    k_old = doc_z[i]

                    # Decrement counts
                    n_kw[k_old, w] -= 1
                    n_k[k_old] -= 1
                    n_dk[d, k_old] -= 1

                    # Conditional posterior for all topics k
                    # p(z = k) proportional to (n_dk[d, k] + alpha) * (n_kw[k, w] + beta) / (n_k[k] + V * beta)
                    p_k = (n_dk[d] + alpha) * (n_kw[:, w] + beta) / (n_k + V_beta)

                    # Fast sampling via cumulative distribution and searchsorted
                    cdf = np.cumsum(p_k)
                    u = rng.uniform(0.0, cdf[-1])
                    k_new = int(np.searchsorted(cdf, u))

                    # Increment counts
                    n_kw[k_new, w] += 1
                    n_k[k_new] += 1
                    n_dk[d, k_new] += 1
                    doc_z[i] = k_new

            if progress_cb and (sweep % 100 == 0 or sweep == self.num_sweeps):
                progress_cb(f"Gibbs Sweep {sweep}/{self.num_sweeps}", sweep, self.num_sweeps)

        # Parameter estimation from final state (PRD §9.10)
        # phi[k, w] = (n_kw + beta) / (n_k + V * beta)
        # theta[d, k] = (n_dk + alpha) / (n_d + K * alpha)
        self.phi = (n_kw + beta) / (n_k[:, np.newaxis] + V_beta)
        self.theta = (n_dk + alpha) / (n_d[:, np.newaxis] + K * alpha)
        self.runtime_seconds = time.time() - start_time

        return self

    def get_top_words(self, dictionary, topn: int = 15) -> List[List[str]]:
        """Get top N words for each topic based on estimated phi."""
        if self.phi is None:
            raise ValueError("Model has not been fitted yet.")
        topics_words = []
        for k in range(self.K):
            top_word_ids = np.argsort(-self.phi[k])[:topn]
            topic_words = [dictionary[int(wid)] for wid in top_word_ids]
            topics_words.append(topic_words)
        return topics_words
