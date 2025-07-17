const useMockData = false;

// Elementos DOM
const genreSelect = document.getElementById("genre")
const ratingSelect = document.getElementById("rating")
const pagesSelect = document.getElementById("pages")
const booksGrid = document.getElementById("books-grid")
const resultsCount = document.getElementById("results-count")
const loading = document.getElementById("loading")
const emptyState = document.getElementById("empty-state")

// Dados mockados para o caso de a API estar indisponível
const mockBooks = [
  {
    id: 1,
    title: "O Alquimista",
    author: "Paulo Coelho",
    genre: "ficcao",
    rating: 4.5,
    pages: 163,
    ageRating: "livre",
    description: "Uma jornada de autodescoberta através do deserto.",
  },
  {
    id: 2,
    title: "1984",
    author: "George Orwell",
    genre: "ficcao",
    rating: 4.8,
    pages: 328,
    ageRating: "14",
    description: "Uma distopia sobre vigilância e controle totalitário.",
  },
  {
    id: 3,
    title: "Harry Potter e a Pedra Filosofal",
    author: "J.K. Rowling",
    genre: "fantasia",
    rating: 4.7,
    pages: 223,
    ageRating: "livre",
    description: "O início da jornada mágica de Harry Potter.",
  },
  {
    id: 4,
    title: "O Código Da Vinci",
    author: "Dan Brown",
    genre: "misterio",
    rating: 4.2,
    pages: 454,
    ageRating: "12",
    description: "Um thriller envolvendo arte, religião e mistério.",
  },
  {
    id: 5,
    title: "Sapiens",
    author: "Yuval Noah Harari",
    genre: "historia",
    rating: 4.6,
    pages: 443,
    ageRating: "14",
    description: "Uma breve história da humanidade.",
  },
]
// Problema: Repetição de livros lado a lado
// Resolução: Criação de uma lista com os ID's dos últimos 5 livros para evitar repetição próxima
const recentRandomBooksHistory = [];
const HISTORY_SIZE = 5;

// Inicialize a página
document.addEventListener("DOMContentLoaded", () => {
  // Função implementada para utilização do localStorage, que salvará o último filtro selecionado pelo usuário
  loadLastSearchPreference();

  // Se não houver filtros selecionados, "resultados da busca" aparece vazio
  if (!getFilters().genre && !getFilters().rating && !getFilters().pages) {
    showEmptyState();
  } else {
    // Se há filtros salvos, inicie uma busca para mostrar os resultados
    initiateNewSearch();
  }
});

// Função que traz os filtros selecionados pelo usuário
function getFilters() {
  return {
    genre: genreSelect.value,
    rating: Number.parseInt(ratingSelect.value) || 0,
    pages: pagesSelect.value,
  }
}

// Função para preencher os campos de filtro selecionados pelo usuário (localStorage)
function setFilterElementValues(filters) {
  if (filters.genre !== undefined) {
    genreSelect.value = filters.genre;
  }
  if (filters.rating !== undefined) {
    ratingSelect.value = filters.rating;
  }
  if (filters.pages !== undefined) {
    pagesSelect.value = filters.pages;
  }
}

// Função de chamada de API
async function searchBooks() {
  showLoading();

  const filters = getFilters();
  const query = buildQuery(filters);

  try {
    const startIndex = 0;

    // ${query}: filtros selecionados pelo usuário (gênero, nota, número de páginas)
    // printType=books: selecionando apenas livros, excluindo revistas
    // startIndex=${startIndex}: definição de qual posição na coleção de páginas de livros irá iniciar
    // maxResults=40: máximo de livros que uma requisição permite retornar
    // langRestrict=pt: idioma dos livros exibidos para o usuário
    // orderBy=relevance: ordenar os livros pela relevância
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&printType=books&startIndex=${startIndex}&maxResults=40&langRestrict=pt&orderBy=relevance`);

    // Verificando se a resposta da requisição é diferente de 200
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro na requisição: Status ${response.status} - ${errorText}`);
    }

    // Resposta bruta da API, convertida para json
    const data = await response.json();

    // Caso não encontre livros para os filtros selecionados pelo usuário
    if (!data.items || data.items.length === 0) {
      displayBooks([]); // Mostra uma lista vazia
      alert("Nenhum livro encontrado para a consulta:", query);
      return;
    }

    // A cada busca, os resultados brutos recebidos da API são transformados para armazenar somente informações pertinentes na constante.
    const books = data.items.map((item) => {
      const volume = item.volumeInfo;
      return {
        id: item.id,
        title: volume.title,
        author: volume.authors ? volume.authors.join(", ") : "Autor desconhecido",
        genre: filters.genre,
        rating: volume.averageRating || 0,
        pages: volume.pageCount || 0,
        description: volume.description || "Sem descrição disponível.",
      };
    });

    const filteredBooks = filterBooks(books, filters); // Aplica filtros
    filteredBooks.sort((a, b) => b.rating - a.rating); // Ordena os livros de acordo com a nota, de maneira decrescente
    displayBooks(filteredBooks); // Exibe os novos resultados

    // Salva o filtro de gênero atual no localStorage
    localStorage.setItem('lastSearchGenre', filters.genre);
    localStorage.setItem('lastSearchRating', filters.rating);
    localStorage.setItem('lastSearchPages', filters.pages);

  } catch (error) {
    alert("Erro ao buscar livros:", error);
    displayBooks([]); // Em caso de erro, limpa a exibição
  }
}

// Problema: Alguns filtros não estavam encontrando livros, então a busca de gênero está sendo realizado em inglês
function buildQuery(filters) {
  const genreMap = {
    ficcao: "fiction",
    romance: "romance",
    misterio: "mystery",
    fantasia: "fantasy",
    biografia: "biography",
    historia: "history",
    ciencia: "science",
    autoajuda: "self-help",
  };

  let query = "";

  // Verificação se o usuário selecionou algum gênero
  if (filters.genre) {
    // Verifica se o gênero selecionado tem tradução, se não houver, será enviado no idioma original
    const translatedGenre = genreMap[filters.genre] || filters.genre;
    query += `subject:${translatedGenre}`;
  } else {
    // Padrão se nenhum gênero for selecionado
    query += "books";
  }

  // Codifica a string para o padrão de URL
  return encodeURIComponent(query.trim());
}

// Função para chamar uma nova busca
function initiateNewSearch() {
  searchBooks();
}

//Seletor de livro aleatório
async function randomBook() {
  showLoading();

  try {
    const maxBooksToFetch = 40;
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=livros&startIndex=0&maxResults=${maxBooksToFetch}&langRestrict=pt&orderBy=relevance`);

    // Verificando se a resposta da requisição é diferente de 200
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro na requisição: Status ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      showEmptyState(); // Exibe estado vazio se não houver livros
      alert("Nenhum livro encontrado para o sorteio.");
      return;
    }

    // Filtra apenas livros que têm título e autores válidos
    const validBooks = data.items
      .map((item) => {
        const volume = item.volumeInfo;
        return {
          id: item.id,
          title: volume.title,
          author: volume.authors ? volume.authors.join(", ") : null,
          genre: "",
          rating: volume.averageRating || 0,
          pages: volume.pageCount || 0,
          description: volume.description || "Sem descrição disponível.",
        };
      })
      .filter((book) => book.title && book.author);

    if (validBooks.length === 0) {
      showEmptyState(); // Exibe estado vazio se, após o filtro, não houver livros válidos
      alert("Nenhum livro válido encontrado após filtragem para o sorteio.");
      return;
    }

    let selected = null;

    // Verifica se existem livros válidos para sortear.
    if (validBooks.length > 0) {
      // Gera um índice aleatório baseado no número de livros na lista 'validBooks'.
      const randomIndex = Math.floor(Math.random() * validBooks.length);

      // Seleciona o livro usando o índice aleatório.
      selected = validBooks[randomIndex];
    } else {
      // Se não houver livros válidos, mostra um estado de "vazio" e para a execução.
      showEmptyState();
      return;
    }

    displayBooks([selected]); // Exibe apenas o livro sorteado

    setTimeout(() => {
      alert(`🎲 Livro sorteado: "${selected.title}" por ${selected.author || 'Autor desconhecido'}!\n\nQue tal dar uma chance a esta leitura?`);
    }, 400);

  } catch (error) {
    alert("Erro ao buscar livro aleatório:", error);
    showEmptyState();
  }
}

// Filtrar livros com base em critérios
function filterBooks(books, filters) {
  return books.filter((book) => {
    // Filtro de gênero
    if (filters.genre && book.genre !== filters.genre) return false;

    // Filtro de classificação
    if (filters.rating && book.rating < filters.rating) return false;

    // Filtro de páginas
    if (filters.pages) {
      if (filters.pages === "short" && book.pages > 200) return false;
      if (filters.pages === "medium" && (book.pages < 200 || book.pages >= 400)) return false;
      if (filters.pages === "long" && book.pages < 400) return false;
    }

    return true;
  });
}

// Exibir livros na grade
function displayBooks(books) {
  hideLoading()

  if (books.length === 0) {
    showEmptyState()
    updateResultsCount(0)
    return
  }

  hideEmptyState()
  updateResultsCount(books.length)

  booksGrid.innerHTML = books.map((book) => createBookCard(book)).join("")
}

// Crie HTML para um cartão de livro
function createBookCard(book) {
  const stars = "★".repeat(Math.floor(book.rating)) + "☆".repeat(5 - Math.floor(book.rating))

  return `
        <div class="book-card">
            <h4 class="book-title">${book.title}</h4>
            <p class="book-author">por ${book.author}</p>
            <div class="book-meta">
                <span class="meta-tag">${getGenreLabel(book.genre)}</span>
                <span class="meta-tag">${book.pages} páginas</span>
            </div>
            <div class="book-rating">
                <span>${stars}</span>
                <span>${book.rating}</span>
            </div>
            <p style="margin-top: 1rem; color: #666; font-size: 0.9rem;">${book.description}</p>
        </div>
    `
}

// Obter rótulo de gênero em português
function getGenreLabel(genre) {
  const labels = {
    ficcao: "Ficção",
    romance: "Romance",
    misterio: "Mistério",
    fantasia: "Fantasia",
    biografia: "Biografia",
    historia: "História",
    ciencia: "Ciência",
    autoajuda: "Autoajuda",
  }
  return labels[genre] || genre
}

// Clear all filters
function clearFilters() {
  genreSelect.value = ""
  ratingSelect.value = "0"
  pagesSelect.value = ""

  // Ao limpar filtros, também limpa o localStorage para gênero
  localStorage.removeItem('lastSearchGenre');
  localStorage.removeItem('lastSearchRating');
  localStorage.removeItem('lastSearchPages');
  showEmptyState()
  updateResultsCount(0)
}

//Atualizar contagem de resultados
function updateResultsCount(count) {
  resultsCount.textContent = `${count} ${count === 1 ? "livro encontrado" : "livros encontrados"}`
}

// Carregando funções de estado
function showLoading() {
  loading.style.display = "block"
  emptyState.style.display = "none"
  booksGrid.innerHTML = ""
  booksGrid.appendChild(loading)
}

function hideLoading() {
  loading.style.display = "none"
}

// Funções de estado vazio
function showEmptyState() {
  emptyState.style.display = "block"
  booksGrid.innerHTML = ""
  booksGrid.appendChild(emptyState)
}

function hideEmptyState() {
  emptyState.style.display = "none"
}

document.querySelectorAll("select").forEach((select) => {
  select.addEventListener("change", () => {
    initiateNewSearch();
  })
})

function loadLastSearchPreference() {
  const lastGenre = localStorage.getItem('lastSearchGenre');
  const lastRating = localStorage.getItem('lastSearchRating');
  const lastPages = localStorage.getItem('lastSearchPages');

  const filtersToApply = {};

  if (lastGenre !== null) {
    filtersToApply.genre = lastGenre;
  }
  if (lastRating !== null) {
    filtersToApply.rating = lastRating;
  }
  if (lastPages !== null) {
    filtersToApply.pages = lastPages;
  }

  setFilterElementValues(filtersToApply);
  console.log("Preferências de busca carregadas:", filtersToApply);
}