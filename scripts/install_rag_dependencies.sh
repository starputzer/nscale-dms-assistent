#!/bin/bash
# Script to install RAG optimization dependencies with fallback options

set -e

echo "=================================================="
echo "RAG Optimization Dependency Installer"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running in virtual environment
if [[ "$VIRTUAL_ENV" == "" ]]; then
    echo -e "${YELLOW}Warning: Not running in a virtual environment${NC}"
    echo "It's recommended to use a virtual environment."
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Function to check command availability
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install package with fallback
install_with_fallback() {
    local package="$1"
    local fallback="$2"
    
    echo -n "Installing $package... "
    if pip install "$package" >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        echo -e "${RED}✗${NC}"
        if [[ -n "$fallback" ]]; then
            echo -n "  Trying fallback $fallback... "
            if pip install "$fallback" >/dev/null 2>&1; then
                echo -e "${GREEN}✓${NC}"
                return 0
            else
                echo -e "${RED}✗${NC}"
                return 1
            fi
        fi
        return 1
    fi
}

# Check Python version
echo -n "Checking Python version... "
PYTHON_VERSION=$(python -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
PYTHON_MAJOR=$(python -c 'import sys; print(sys.version_info[0])')
PYTHON_MINOR=$(python -c 'import sys; print(sys.version_info[1])')

if [[ $PYTHON_MAJOR -ge 3 ]] && [[ $PYTHON_MINOR -ge 8 ]]; then
    echo -e "${GREEN}$PYTHON_VERSION ✓${NC}"
else
    echo -e "${RED}$PYTHON_VERSION (requires >= 3.8)${NC}"
    exit 1
fi

# Check available memory
echo -n "Checking available memory... "
if command_exists free; then
    AVAILABLE_MEM=$(free -m | awk 'NR==2{print $7}')
    if [[ $AVAILABLE_MEM -lt 2048 ]]; then
        echo -e "${YELLOW}${AVAILABLE_MEM}MB (recommended: 2048MB+)${NC}"
    else
        echo -e "${GREEN}${AVAILABLE_MEM}MB ✓${NC}"
    fi
else
    echo -e "${YELLOW}Could not check${NC}"
fi

# Install core dependencies
echo -e "\nInstalling core dependencies..."

# Essential packages
ESSENTIAL_PACKAGES=(
    "numpy>=1.21.0"
    "scikit-learn>=1.0.0"
    "tqdm>=4.62.0"
    "aiofiles>=0.8.0"
    "psutil>=5.8.0"
)

for package in "${ESSENTIAL_PACKAGES[@]}"; do
    install_with_fallback "$package" ""
done

# NLP packages
echo -e "\nInstalling NLP packages..."
install_with_fallback "spacy>=3.4.0" "spacy>=3.0.0"

# Install Spacy models
echo -n "Installing German language model... "
if python -m spacy download de_core_news_md >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}Failed, trying smaller model${NC}"
    if python -m spacy download de_core_news_sm >/dev/null 2>&1; then
        echo -e "${GREEN}✓ (small model)${NC}"
    else
        echo -e "${RED}✗${NC}"
    fi
fi

# Embedding and ML packages
echo -e "\nInstalling ML packages..."
install_with_fallback "sentence-transformers>=2.2.0" ""
install_with_fallback "torch>=2.0.0" "torch>=1.10.0"

# Vector search packages
echo -e "\nInstalling vector search packages..."

# Check CUDA availability for FAISS
echo -n "Checking CUDA availability... "
if command_exists nvidia-smi && nvidia-smi >/dev/null 2>&1; then
    echo -e "${GREEN}CUDA available ✓${NC}"
    FAISS_PACKAGE="faiss-gpu>=1.7.0"
else
    echo -e "${YELLOW}No CUDA, using CPU version${NC}"
    FAISS_PACKAGE="faiss-cpu>=1.7.0"
fi

if ! install_with_fallback "$FAISS_PACKAGE" ""; then
    echo -e "${YELLOW}FAISS installation failed. Trying conda...${NC}"
    if command_exists conda; then
        conda install -c pytorch faiss-cpu -y
    else
        echo -e "${RED}Could not install FAISS. Some features will be limited.${NC}"
    fi
fi

# Sparse search
install_with_fallback "rank-bm25>=0.2.0" ""

# Document processing packages
echo -e "\nInstalling document processing packages..."
install_with_fallback "PyMuPDF>=1.20.0" "pymupdf>=1.18.0"
install_with_fallback "python-docx>=0.8.0" ""
install_with_fallback "openpyxl>=3.0.0" ""
install_with_fallback "beautifulsoup4>=4.10.0" ""
install_with_fallback "markdownify>=0.10.0" ""

# Performance packages
echo -e "\nInstalling performance packages..."
install_with_fallback "redis>=4.0.0" "redis>=3.5.0"
install_with_fallback "watchdog>=2.1.0" ""

# Quality assessment packages
install_with_fallback "textstat>=0.7.0" ""
install_with_fallback "langdetect>=1.0.0" ""

# Check Redis server
echo -e "\nChecking Redis server..."
if command_exists redis-cli; then
    if redis-cli ping >/dev/null 2>&1; then
        echo -e "${GREEN}Redis server is running ✓${NC}"
    else
        echo -e "${YELLOW}Redis installed but not running${NC}"
        echo "Start Redis with: sudo systemctl start redis"
    fi
else
    echo -e "${YELLOW}Redis not installed${NC}"
    echo "Install Redis with:"
    echo "  Ubuntu/Debian: sudo apt-get install redis-server"
    echo "  macOS: brew install redis"
    echo "  CentOS/RHEL: sudo yum install redis"
fi

# Create required directories
echo -e "\nCreating required directories..."
DIRECTORIES=(
    "data/raw_docs"
    "data/converted"
    "cache/embeddings"
    "cache/document_index"
    "cache/hybrid_index"
    "logs/rag_optimization"
)

for dir in "${DIRECTORIES[@]}"; do
    mkdir -p "$dir"
    echo -e "  Created: $dir"
done

# Test imports
echo -e "\nTesting imports..."
PYTHON_TEST_SCRIPT="
import sys
errors = []

try:
    import faiss
    print('✓ FAISS')
except ImportError:
    errors.append('FAISS')
    print('✗ FAISS')

try:
    import spacy
    nlp = spacy.load('de_core_news_md')
    print('✓ Spacy with German model')
except:
    try:
        nlp = spacy.load('de_core_news_sm')
        print('✓ Spacy with small German model')
    except:
        errors.append('Spacy German model')
        print('✗ Spacy German model')

try:
    from sentence_transformers import SentenceTransformer
    print('✓ Sentence Transformers')
except ImportError:
    errors.append('Sentence Transformers')
    print('✗ Sentence Transformers')

try:
    import redis
    print('✓ Redis client')
except ImportError:
    errors.append('Redis client')
    print('✗ Redis client')

try:
    from rank_bm25 import BM25Okapi
    print('✓ BM25')
except ImportError:
    errors.append('BM25')
    print('✗ BM25')

if errors:
    print(f'\nMissing imports: {", ".join(errors)}')
    sys.exit(1)
else:
    print('\nAll imports successful!')
"

python -c "$PYTHON_TEST_SCRIPT"

# Generate requirements file
echo -e "\nGenerating optimized requirements file..."
cat > requirements_rag_installed.txt << EOF
# Successfully installed RAG optimization dependencies
# Generated on $(date)

# Core ML/AI
numpy>=$(pip show numpy | grep Version | cut -d' ' -f2)
scikit-learn>=$(pip show scikit-learn | grep Version | cut -d' ' -f2)
torch>=$(pip show torch | grep Version | cut -d' ' -f2 || echo "not installed")
sentence-transformers>=$(pip show sentence-transformers | grep Version | cut -d' ' -f2 || echo "not installed")

# NLP
spacy>=$(pip show spacy | grep Version | cut -d' ' -f2)
langdetect>=$(pip show langdetect | grep Version | cut -d' ' -f2 || echo "not installed")
textstat>=$(pip show textstat | grep Version | cut -d' ' -f2 || echo "not installed")

# Search
rank-bm25>=$(pip show rank-bm25 | grep Version | cut -d' ' -f2 || echo "not installed")
# faiss - check separately as it might be conda-installed

# Document processing
PyMuPDF>=$(pip show PyMuPDF | grep Version | cut -d' ' -f2 || echo "not installed")
python-docx>=$(pip show python-docx | grep Version | cut -d' ' -f2 || echo "not installed")
openpyxl>=$(pip show openpyxl | grep Version | cut -d' ' -f2 || echo "not installed")
beautifulsoup4>=$(pip show beautifulsoup4 | grep Version | cut -d' ' -f2 || echo "not installed")
markdownify>=$(pip show markdownify | grep Version | cut -d' ' -f2 || echo "not installed")

# Performance
redis>=$(pip show redis | grep Version | cut -d' ' -f2 || echo "not installed")
aiofiles>=$(pip show aiofiles | grep Version | cut -d' ' -f2)
psutil>=$(pip show psutil | grep Version | cut -d' ' -f2)
watchdog>=$(pip show watchdog | grep Version | cut -d' ' -f2 || echo "not installed")
tqdm>=$(pip show tqdm | grep Version | cut -d' ' -f2)
EOF

echo -e "${GREEN}\nInstallation complete!${NC}"
echo -e "\nNext steps:"
echo "1. Ensure Redis server is running: sudo systemctl start redis"
echo "2. Test the optimized RAG engine: python -m app.modules.rag.optimized_rag_engine"
echo "3. Run migration: python -m app.modules.rag.migrate_to_optimized --dry-run"
echo -e "\nInstalled packages saved to: requirements_rag_installed.txt"