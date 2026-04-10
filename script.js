
let allProducts = [];
let selectedProducts = JSON.parse(localStorage.getItem("selectedProducts")) || [];
const productSearch = document.getElementById("productSearch");
const messages = [
  {
    role: "system",
    content:
      "You are L'Oréal's Smart Routine Builder. Only answer questions related to the user's selected products, their generated routine, skincare, haircare, makeup, fragrance, and beauty recommendations. Build routines using the selected products only when possible. If the user asks something unrelated, politely redirect them back to beauty and L'Oréal product questions."
  }
];
/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const clearSelectionsBtn = document.getElementById("clearSelectionsBtn");

const WORKER_URL = "https://cold-flower-0525.stellakuhlman123.workers.dev/";
/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  allProducts = data.products;
  return allProducts;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map((product) => {
      const isSelected = selectedProducts.find((p) => p.id === product.id);

      return `
        <div class="product-card ${isSelected ? "selected" : ""}" data-id="${product.id}">
          <img src="${product.image}" alt="${product.name}">
          <div class="product-info">
            <h3>${product.name}</h3>
            <p>${product.brand}</p>
            <button class="details-btn" data-id="${product.id}" type="button">
              View Details
            </button>
            <div class="product-description hidden" id="desc-${product.id}">
              ${product.description}
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  addProductClickListeners();
  addDetailsButtonListeners();
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async () => {
  if (allProducts.length === 0) {
    await loadProducts();
  }
  applyFilters();
});

productSearch.addEventListener("input", async () => {
  if (allProducts.length === 0) {
    await loadProducts();
  }
  applyFilters();
});

/* Chat form submission handler - placeholder for OpenAI integration */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userInput = document.getElementById("userInput");
  const userMessage = userInput.value.trim();
  if (!userMessage) return;

  addChatMessage("user", userMessage);
  userInput.value = "";

  messages.push({
    role: "user",
    content: userMessage
  });

  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: messages
      })
    });

    const data = await response.json();

    const aiReply =
      data?.choices?.[0]?.message?.content ||
      data?.error ||
      "Sorry, I couldn’t generate a response.";

    addChatMessage("ai", aiReply);

    messages.push({
      role: "assistant",
      content: aiReply
    });
  } catch (error) {
    console.error("Chat error:", error);
    addChatMessage("ai", "Sorry — something went wrong. Please try again.");
  }
});
const generateRoutineBtn = document.getElementById("generateRoutine");

generateRoutineBtn.addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    addChatMessage("ai", "Please select at least one product first.");
    return;
  }

  const productData = selectedProducts.map((product) => ({
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description
  }));

  const routinePrompt = `
Build a personalized beauty routine using only these selected L'Oréal-related products.

Selected products:
${JSON.stringify(productData, null, 2)}

Please:
- Organize the routine in the best order
- Explain what each product does
- Mention if it should be used morning, night, or both
- Keep the routine practical and easy to follow
- Only use the selected products in the routine
`;

  addChatMessage("user", "Generate a routine from my selected products.");

  messages.push({
    role: "user",
    content: routinePrompt
  });

  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: messages
      })
    });

    const data = await response.json();

    const aiReply =
      data?.choices?.[0]?.message?.content ||
      data?.error ||
      "Sorry, I couldn’t generate a routine.";

    addChatMessage("ai", aiReply);

    messages.push({
      role: "assistant",
      content: aiReply
    });
  } catch (error) {
    console.error("Routine generation error:", error);
    addChatMessage("ai", "Sorry — I couldn’t generate your routine.");
  }
});

function addProductClickListeners() {
  const cards = document.querySelectorAll(".product-card");

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const id = Number(card.dataset.id);
      const product = allProducts.find((p) => p.id === id);

      const alreadySelected = selectedProducts.find((p) => p.id === id);

      if (alreadySelected) {
        selectedProducts = selectedProducts.filter((p) => p.id !== id);
      } else {
        selectedProducts.push(product);
      }

      localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));

      renderSelectedProducts();
      displayProducts(productsContainer.currentProducts || allProducts);
    });
  });
}
function addDetailsButtonListeners() {
  const detailButtons = document.querySelectorAll(".details-btn");

  detailButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();

      const id = button.dataset.id;
      const description = document.getElementById(`desc-${id}`);

      description.classList.toggle("hidden");

      if (description.classList.contains("hidden")) {
        button.textContent = "View Details";
      } else {
        button.textContent = "Hide Details";
      }
    });
  });
}

function renderSelectedProducts() {
  const list = document.getElementById("selectedProductsList");

  if (selectedProducts.length === 0) {
    list.innerHTML = "<p>No products selected</p>";
    clearSelectionsBtn.style.display = "none";
    return;
  }

  clearSelectionsBtn.style.display = "inline-block";

  list.innerHTML = selectedProducts
    .map(
      (p) => `
      <div class="selected-item">
        <span>${p.name}</span>
        <button data-id="${p.id}" type="button">✕</button>
      </div>
    `
    )
    .join("");

  addRemoveListeners();
}

function addRemoveListeners() {
  const buttons = document.querySelectorAll(".selected-item button");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.id);
      selectedProducts = selectedProducts.filter((p) => p.id !== id);

      localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));

      renderSelectedProducts();
      displayProducts(productsContainer.currentProducts || allProducts);
    });
  });
}

clearSelectionsBtn.addEventListener("click", () => {
  selectedProducts = [];
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));

  renderSelectedProducts();
  displayProducts(productsContainer.currentProducts || allProducts);
});
function applyFilters() {
  let filteredProducts = [...allProducts];

  const selectedCategory = categoryFilter.value;
  const searchTerm = productSearch.value.trim().toLowerCase();

  if (selectedCategory) {
    filteredProducts = filteredProducts.filter(
      (product) => product.category === selectedCategory
    );
  }

  if (searchTerm) {
    filteredProducts = filteredProducts.filter((product) => {
      return (
        product.name.toLowerCase().includes(searchTerm) ||
        product.brand.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm)
      );
    });
  }

  productsContainer.currentProducts = filteredProducts;
  displayProducts(filteredProducts);
}


function addChatMessage(role, text) {
  const row = document.createElement("div");
  row.classList.add("message-row", role);

  const bubble = document.createElement("div");
  bubble.classList.add("msg", role);

  const label = document.createElement("div");
  label.classList.add("msg-label");
  label.textContent = role === "user" ? "You" : "L'Oréal Advisor";

  const content = document.createElement("div");
  content.textContent = text;

  bubble.appendChild(label);
  bubble.appendChild(content);
  row.appendChild(bubble);
  chatWindow.appendChild(row);

  chatWindow.scrollTop = chatWindow.scrollHeight;
}
renderSelectedProducts();