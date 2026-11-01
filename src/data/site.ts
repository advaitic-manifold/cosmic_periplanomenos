// Single source of truth. Everything below comes from the CV / papers.
// Anything not in them is marked [REAL DATA REQUIRED].
export const person = {
  name: 'Manav Patel',
  tagline: 'Building intelligent systems for scientific discovery.',
  email: 'advaitic.manifold@gmail.com',
  github: 'https://github.com/advaitic-manifold',
  linkedin: 'https://linkedin.com/in/manav-patel-68738a423',
  location: 'Ahmedabad, Gujarat, India',
  demos: ['https://persistent-cosmic-filament.netlify.app/', 'https://prismastro.netlify.app/'],
};

export type Paper = {
  slug: string; title: string; authors: string; status: string; venue: string;
  domain: 'Astronomy + AI' | 'Healthcare AI'; summary: string; keywords: string[];
};

export const papers: Paper[] = [
  { slug: 'seer-survival-pipeline', domain: 'Healthcare AI',
    title: 'Bridging Clinical Integrity and Machine Learning: A High-Fidelity Pipeline for Zero-Error Survival Classification on the SEER Dataset',
    authors: 'M. Patel, R. Jadhav, D. Patel', status: 'Accepted with minor revisions', venue: 'CICON 2026 (Paper #226)',
    summary: 'Reproducible six-stage pipeline for breast-cancer survival prediction on SEER (4,024 records, 15 features). Random Forest, SVM-RBF and Logistic Regression are compared under leakage-free, seed-fixed conditions, with SHAP, calibration and a DQN/LP threshold optimizer. Random Forest: 89.94% test accuracy, 90.80% ± 0.72% 5-fold CV. Recall on the minority (deceased) class is only 47%, which the paper discloses.',
    keywords: ['SEER', 'reproducibility', 'SHAP', 'calibration', 'class imbalance'] },
  { slug: 'astrophotonic-operator-cartography', domain: 'Astronomy + AI',
    title: 'Astrophotonic Operator Cartography via Patch-Resolved Scrambling Dynamics and Free-Spectral Entropy',
    authors: 'M. N. Patel, M. K. Halani, V. Salecha', status: 'Selected (ICAIRA 2026); also submitted to BASE 2026', venue: 'ICAIRA 2026, Istanbul; BASE 2026 (Nov 18–20)',
    summary: 'Maps 8×8 image patches to normalized symmetric operators and analyzes them with out-of-time-order-commutator and free-probability descriptors. On a leave-one-scene-out benchmark the operator descriptors alone do not beat conventional features (F1 0.655 vs 0.674); added to them they raise pooled F1 to 0.693, a complementary but not statistically conclusive gain (exact Wilcoxon p = 0.078).',
    keywords: ['OTOC', 'free probability', 'spectral entropy', 'visualization'] },
  { slug: 'prime-indexed-descriptors', domain: 'Astronomy + AI',
    title: 'Prime-Indexed Arithmetic, Topological, and Learned Descriptors for an Astronomical FITS Image: A Single-Field Proof of Concept',
    authors: 'M. N. Patel, M. K. Halani, V. Salecha', status: 'Manuscript prepared (not yet submitted)', venue: '[REAL DATA REQUIRED]',
    summary: 'Single-field proof of concept on one 512×510 FITS image. Verifies a numerical product identity (max residual 1.2×10⁻¹²) and reports SVD energy concentration. Explicitly separates verified numerics from terminology-inspired analogues, and reports failed diagnostics (Hodge–Newton violation fraction 0.941). No claim of predictive improvement or generalization.',
    keywords: ['FITS', 'SVD', 'topology', 'evidence-bounded'] },
  { slug: 'beyond-black-boxes-cat-v7', domain: 'Astronomy + AI',
    title: 'Beyond Black Boxes: Bitwise-Audited Topological and Unsupervised Anomaly Detection on Correlated FITS Image Lattices',
    authors: 'M. N. Patel, A. Borana, M. K. Halani, R. Jadhav', status: 'Manuscript prepared', venue: '[REAL DATA REQUIRED]',
    summary: 'CAT v7.0.0: an auditable six-stage pipeline producing a 24-column catalog, with BIC-selected Gaussian mixtures, Isolation Forest, surrogate-audited topology, injection–recovery calibration and SHA-256 / fixed-seed reproducibility records, evaluated on three datasets.',
    keywords: ['unsupervised ML', 'anomaly detection', 'reproducibility', 'null models'] },
  { slug: 'multiwavelength-morphology', domain: 'Astronomy + AI',
    title: 'Quantitative Extragalactic Morphology, Spatial Clustering, and Differential Number-Count Scaling Across Multi-Wavelength Deep-Field Archives',
    authors: 'M. N. Patel, M. K. Halani, V. Salecha', status: 'Manuscript prepared', venue: '[REAL DATA REQUIRED]',
    summary: 'Cross-dataset statistical-modelling study built on CAT v7.0.0: correlated-noise uncertainty calibration, PSF-convolved profile fitting, two-point statistics, maximum-likelihood power-law fits and surrogate-based Minkowski-functional tests.',
    keywords: ['uncertainty calibration', 'Sérsic fitting', 'hypothesis testing'] },
  { slug: 'microlocal-symplectic-engine', domain: 'Astronomy + AI',
    title: 'Deterministic Geometric and Topological Representation Learning on Astronomical FITS Imagery: A Dual Microlocal–Symplectic and Derived–Operadic Engine',
    authors: 'M. N. Patel, M. K. Halani, V. Salecha', status: 'Manuscript prepared', venue: '[REAL DATA REQUIRED]',
    summary: 'A zero-parameter, untrained feature engine verified with JAX automatic differentiation, sparse linear algebra and persistent homology. Reports exact identities to machine precision and discloses limitations (Morse–Euler boundary gap of −11, order-1.07 convergence, 31% rank-24 projection deviation).',
    keywords: ['JAX', 'persistent homology', 'deterministic ML', 'verification'] },
];

export const experience = [
  { role: 'Research Assistant', org: 'Silver Oak University, Ahmedabad', when: 'May – Sep 2026', note: 'Supported the SEER survival pipeline behind the CICON 2026 paper: leakage-free preprocessing, benchmarking, SHAP and threshold optimization.' },
  { role: 'Peer Reviewer', org: 'AusDM 2026', when: 'Sep 2026', note: 'Reviewed two submissions for methodological soundness, experimental validity and clarity.' },
  { role: 'Data Scientist Intern', org: 'Zolvac Technologies', when: 'Semester 8, 2026', note: '[REAL DATA REQUIRED] — responsibilities and outcomes not yet supplied.' },
];

export const timeline = [
  { when: '2022 – 2026', what: 'B.Tech Information Technology, Silver Oak University (CGPA 9.22/10)' },
  { when: 'May – Sep 2026', what: 'Research Assistant, CICON 2026 paper' },
  { when: 'Semester 8, 2026', what: 'Data Scientist Intern, Zolvac Technologies' },
  { when: 'Sep 2026', what: 'Peer reviewer, AusDM 2026' },
  { when: 'Nov 18–20, 2026', what: 'BASE 2026 (submission), University of Aizu / NIT Delhi / IIT Delhi' },
];

export const skills: Record<string, string[]> = {
  'Machine learning': ['scikit-learn', 'SHAP', 'calibration', 'Gaussian mixtures + BIC', 'Isolation Forest', 'PCA / SVD'],
  'Deep learning & differentiable programming': ['PyTorch', 'JAX autodiff', 'autoencoders', 'RNN / CNN'],
  'Scientific computing': ['NumPy', 'SciPy (sparse / ARPACK)', 'Astropy', 'scikit-image', 'TensorLy'],
  'Statistics & inference': ['maximum likelihood', 'surrogate null models', 'injection–recovery', 'uncertainty calibration'],
  'Topology & geometry': ['GUDHI', 'giotto-tda', 'persistent homology', 'Hodge decomposition'],
  'Engineering': ['Python', 'C++', 'JavaScript / React', 'SQL', 'reproducible pipelines', 'SHA-256 provenance'],
};
