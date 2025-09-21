const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();

// 🔹 Configurações Express
app.use(cors());
app.use(express.text({ limit: "50mb" }));
app.use(express.json({ limit: "50mb" }));

// 🔹 Supabase
const SUPABASE_URL = "https://hvbvembchrfhrmoasokm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2YnZlbWJjaHJmaHJtb2Fzb2ttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMTc4MTUsImV4cCI6MjA3MTg5MzgxNX0.4ADUxmO7hM24CCWDYnYhmptPvI25P9XRgN5H7xg8SGc"; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 🔹 Limite de caracteres por trecho
const LIMITE = 500;

// 🔹 Função para dividir texto sem cortar palavras
function dividirTexto(texto, limite) {
  let partes = [];
  let inicio = 0;

  while (inicio < texto.length) {
    let fim = inicio + limite;
    if (fim >= texto.length) {
      partes.push(texto.slice(inicio));
      break;
    }

    let trecho = texto.slice(inicio, fim);
    let ultimoEspaco = trecho.lastIndexOf(" ");

    if (ultimoEspaco === -1) ultimoEspaco = limite;

    partes.push(texto.slice(inicio, inicio + ultimoEspaco));
    inicio += ultimoEspaco + 1;
  }

  return partes;
}

// 🔹 POST: salvar texto no livro correto
app.post("/upload-text", async (req, res) => {
  const { texto, livroId } = req.body;

  if (!texto || !livroId) {
    return res.status(400).json({ status: "erro", mensagem: "Texto e livroId são obrigatórios" });
  }

  const tabela = `Livro-${livroId}`;
  const partes = dividirTexto(texto, LIMITE);

  try {
    for (let i = 0; i < partes.length; i++) {
      const { error } = await supabase
        .from(tabela)
        .insert([{ status: i === 0, Trecho: partes[i] }]);
      if (error) throw error;
    }

    res.json({
      status: "ok",
      mensagem: `Texto salvo no ${tabela} em ${partes.length} parte(s)!`,
      partes: partes.length,
    });
  } catch (err) {
    console.error("Erro Supabase:", err);
    res.status(500).json({ status: "erro", mensagem: "Falha ao salvar no Supabase" });
  }
});

// 🔹 GET: retornar todo o conteúdo de um livro
app.get("/livro/:livroId", async (req, res) => {
  const { livroId } = req.params;
  const tabela = `Livro-${livroId}`;

  try {
    // Busca todos os dados sem depender do nome exato da coluna de id
    const { data, error } = await supabase
      .from(tabela)
      .select("*");

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ status: "erro", mensagem: "Livro não encontrado ou vazio" });
    }

    // Detecta automaticamente o nome da coluna do texto
    const textoColuna = Object.keys(data[0]).find(k => k.toLowerCase() === "trecho" || k.toLowerCase() === "texto");
    if (!textoColuna) {
      return res.status(500).json({ status: "erro", mensagem: "Coluna de texto não encontrada na tabela" });
    }

    // Junta todos os trechos
    const textoCompleto = data.map(t => t[textoColuna]).join(" ");

    res.json({
      status: "ok",
      livroId,
      trechos: data,
      textoCompleto,
    });
  } catch (err) {
    console.error("Erro Supabase:", err);
    res.status(500).json({ status: "erro", mensagem: "Falha ao obter o livro" });
  }
});

// 🔹 Inicia servidor
app.listen(3000, () => {
  console.log("✅ Servidor rodando em: http://localhost:3000");
});
