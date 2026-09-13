// Testes temporários do chapterService usando Mock.
// Execute em localhost sem ?datasource=supabase.

import * as chapterService from "./js/services/chapterService.js";
import * as authService from "./js/services/authService.js";

const results = [];

let createdChapterId = null;

// Registra o resultado de cada teste.
function recordResult(id, description, passed, details = "") {
  results.push({
    id,
    description,
    passed,
    details
  });

  const symbol = passed ? "✅" : "❌";

  console.log(`${symbol} ${id} - ${description}`);

  if (!passed && details) {
    console.error(details);
  }
}

// Executa um teste individual.
async function runTest(id, description, testFn) {
  try {
    await testFn();

    recordResult(
      id,
      description,
      true
    );
  } catch (error) {
    recordResult(
      id,
      description,
      false,
      error instanceof Error
        ? error.message
        : String(error)
    );
  }
}

// Interrompe o teste quando a condição não é atendida.
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Valida resposta de sucesso.
function assertSuccess(result) {
  assert(
    result?.error === null,
    `Esperado error=null. Recebido: ${JSON.stringify(result)}`
  );

  assert(
    result?.data !== null,
    `Esperado data preenchido. Recebido: ${JSON.stringify(result)}`
  );
}

// Valida resposta de erro.
function assertError(result, code) {
  assert(
    result?.data === null,
    `Esperado data=null. Recebido: ${JSON.stringify(result)}`
  );

  assert(
    result?.error?.code === code,
    `Esperado erro ${code}. Recebido: ${JSON.stringify(result)}`
  );
}

// Login do usuário autor dos livros Mock.
async function login() {
  const result =
    await authService.signIn({
      email: "teste1@gmail.com",
      password: "090909"
    });

  assert(
    result?.error === null,
    `Falha no login: ${JSON.stringify(result)}`
  );
}

// Garante logout antes de testes públicos.
async function logout() {
  await authService.signOut();
}

// IDs fixos do mockData.
const PUBLISHED_BOOK_ID =
  "11111111-1111-1111-1111-111111111111";

const DRAFT_BOOK_ID =
  "22222222-2222-2222-2222-222222222222";

const PUBLISHED_CHAPTER_ID =
  "33333333-3333-3333-3333-333333333333";

const DRAFT_CHAPTER_ID =
  "44444444-4444-4444-4444-444444444444";

const DRAFT_BOOK_CHAPTER_ID =
  "55555555-5555-5555-5555-555555555555";

async function runAllTests() {
  console.clear();

  console.log(
    "=== TESTES DO chapterService - MOCK ==="
  );

  await logout();

  // =====================================================
  // LEITURA PÚBLICA
  // =====================================================

  await runTest(
    "C01",
    "getChaptersByBook rejeita ID inválido",
    async () => {
      const invalidValues = [
        "",
        "abc",
        null,
        undefined,
        123
      ];

      for (const value of invalidValues) {
        const result =
          await chapterService.getChaptersByBook(
            value
          );

        assertError(
          result,
          "VALIDATION_ERROR"
        );
      }
    }
  );

  await runTest(
    "C02",
    "getChaptersByBook retorna apenas publicados para visitante",
    async () => {
      const result =
        await chapterService.getChaptersByBook(
          PUBLISHED_BOOK_ID
        );

      assertSuccess(result);

      assert(
        Array.isArray(result.data),
        "Resultado não é um array."
      );

      assert(
        result.data.length === 1,
        `Esperado 1 capítulo. Recebidos: ${result.data.length}`
      );

      assert(
        result.data[0].id ===
          PUBLISHED_CHAPTER_ID,
        "Capítulo publicado incorreto."
      );

      assert(
        result.data.every(
          (chapter) =>
            chapter.status === "published"
        ),
        "Visitante recebeu capítulo draft."
      );
    }
  );

  await runTest(
    "C03",
    "getChaptersByBook mantém ordem por position",
    async () => {
      const result =
        await chapterService.getChaptersByBook(
          PUBLISHED_BOOK_ID
        );

      assertSuccess(result);

      for (
        let index = 1;
        index < result.data.length;
        index++
      ) {
        assert(
          result.data[index - 1].position <
            result.data[index].position,
          "Capítulos fora da ordem de posição."
        );
      }
    }
  );

  await runTest(
    "C04",
    "getChaptersByBook oculta livro draft de visitante",
    async () => {
      const result =
        await chapterService.getChaptersByBook(
          DRAFT_BOOK_ID
        );

      assertError(
        result,
        "NOT_FOUND"
      );
    }
  );

  await runTest(
    "C05",
    "getChaptersByBook retorna NOT_FOUND para livro inexistente",
    async () => {
      const result =
        await chapterService.getChaptersByBook(
          "99999999-9999-9999-9999-999999999999"
        );

      assertError(
        result,
        "NOT_FOUND"
      );
    }
  );

  await runTest(
    "C06",
    "getChapterById rejeita ID inválido",
    async () => {
      const invalidValues = [
        "",
        "abc",
        null,
        undefined,
        123
      ];

      for (const value of invalidValues) {
        const result =
          await chapterService.getChapterById(
            value
          );

        assertError(
          result,
          "VALIDATION_ERROR"
        );
      }
    }
  );

  await runTest(
    "C07",
    "getChapterById permite capítulo publicado para visitante",
    async () => {
      const result =
        await chapterService.getChapterById(
          PUBLISHED_CHAPTER_ID
        );

      assertSuccess(result);

      assert(
        result.data.id ===
          PUBLISHED_CHAPTER_ID,
        "Capítulo retornado incorretamente."
      );
    }
  );

  await runTest(
    "C08",
    "getChapterById oculta capítulo draft de visitante",
    async () => {
      const result =
        await chapterService.getChapterById(
          DRAFT_CHAPTER_ID
        );

      assertError(
        result,
        "NOT_FOUND"
      );
    }
  );

  await runTest(
    "C09",
    "getChapterById oculta capítulo de livro draft",
    async () => {
      const result =
        await chapterService.getChapterById(
          DRAFT_BOOK_CHAPTER_ID
        );

      assertError(
        result,
        "NOT_FOUND"
      );
    }
  );

  await runTest(
    "C10",
    "getChapterById retorna NOT_FOUND para UUID inexistente",
    async () => {
      const result =
        await chapterService.getChapterById(
          "99999999-9999-9999-9999-999999999999"
        );

      assertError(
        result,
        "NOT_FOUND"
      );
    }
  );

  // =====================================================
  // OPERAÇÕES SEM AUTENTICAÇÃO
  // =====================================================

  await runTest(
    "C11",
    "createChapter exige autenticação",
    async () => {
      const result =
        await chapterService.createChapter(
          PUBLISHED_BOOK_ID,
          {
            title: "Capítulo",
            content: "Conteúdo"
          }
        );

      assertError(
        result,
        "UNAUTHENTICATED"
      );
    }
  );

  await runTest(
    "C12",
    "updateChapter exige autenticação",
    async () => {
      const result =
        await chapterService.updateChapter(
          PUBLISHED_CHAPTER_ID,
          {
            title: "Novo título"
          }
        );

      assertError(
        result,
        "UNAUTHENTICATED"
      );
    }
  );

  await runTest(
    "C13",
    "publishChapter exige autenticação",
    async () => {
      const result =
        await chapterService.publishChapter(
          DRAFT_CHAPTER_ID
        );

      assertError(
        result,
        "UNAUTHENTICATED"
      );
    }
  );

  await runTest(
    "C14",
    "deleteChapter exige autenticação",
    async () => {
      const result =
        await chapterService.deleteChapter(
          DRAFT_CHAPTER_ID
        );

      assertError(
        result,
        "UNAUTHENTICATED"
      );
    }
  );

  // =====================================================
  // LOGIN
  // =====================================================

  await runTest(
    "C15",
    "login do usuário Mock funciona",
    async () => {
      await login();
    }
  );

  // =====================================================
  // LEITURA COMO AUTOR
  // =====================================================

  await runTest(
    "C16",
    "autor visualiza capítulos publicados e drafts",
    async () => {
      const result =
        await chapterService.getChaptersByBook(
          PUBLISHED_BOOK_ID
        );

      assertSuccess(result);

      assert(
        result.data.length === 2,
        `Esperado 2 capítulos. Recebidos: ${result.data.length}`
      );

      assert(
        result.data.some(
          (chapter) =>
            chapter.id ===
            DRAFT_CHAPTER_ID
        ),
        "Draft não foi retornado ao autor."
      );
    }
  );

  await runTest(
    "C17",
    "autor visualiza capítulo draft diretamente",
    async () => {
      const result =
        await chapterService.getChapterById(
          DRAFT_CHAPTER_ID
        );

      assertSuccess(result);

      assert(
        result.data.status === "draft",
        "Capítulo deveria estar em draft."
      );
    }
  );

  await runTest(
    "C18",
    "autor visualiza capítulos do próprio livro draft",
    async () => {
      const result =
        await chapterService.getChaptersByBook(
          DRAFT_BOOK_ID
        );

      assertSuccess(result);

      assert(
        result.data.length === 1,
        "Capítulo do livro draft não foi retornado."
      );
    }
  );

  // =====================================================
  // CREATE
  // =====================================================

  await runTest(
    "C19",
    "createChapter rejeita ID de livro inválido",
    async () => {
      const result =
        await chapterService.createChapter(
          "id-invalido",
          {
            title: "Teste",
            content: "Teste"
          }
        );

      assertError(
        result,
        "VALIDATION_ERROR"
      );
    }
  );

  await runTest(
    "C20",
    "createChapter rejeita livro inexistente",
    async () => {
      const result =
        await chapterService.createChapter(
          "99999999-9999-9999-9999-999999999999",
          {
            title: "Teste",
            content: "Teste"
          }
        );

      assertError(
        result,
        "NOT_FOUND"
      );
    }
  );

  await runTest(
    "C21",
    "createChapter rejeita dados inválidos",
    async () => {
      const result =
        await chapterService.createChapter(
          PUBLISHED_BOOK_ID,
          null
        );

      assertError(
        result,
        "VALIDATION_ERROR"
      );
    }
  );

  await runTest(
    "C22",
    "createChapter rejeita título com tipo inválido",
    async () => {
      const result =
        await chapterService.createChapter(
          PUBLISHED_BOOK_ID,
          {
            title: 123,
            content: "Conteúdo"
          }
        );

      assertError(
        result,
        "VALIDATION_ERROR"
      );
    }
  );

  await runTest(
    "C23",
    "createChapter rejeita conteúdo com tipo inválido",
    async () => {
      const result =
        await chapterService.createChapter(
          PUBLISHED_BOOK_ID,
          {
            title: "Título",
            content: 123
          }
        );

      assertError(
        result,
        "VALIDATION_ERROR"
      );
    }
  );

  await runTest(
    "C24",
    "createChapter permite draft incompleto",
    async () => {
      const result =
        await chapterService.createChapter(
          PUBLISHED_BOOK_ID,
          {}
        );

      assertSuccess(result);

      createdChapterId =
        result.data.id;

      assert(
        result.data.title === null,
        "Título deveria ser null."
      );

      assert(
        result.data.content === null,
        "Conteúdo deveria ser null."
      );

      assert(
        result.data.status === "draft",
        "Novo capítulo deveria nascer em draft."
      );

      assert(
        result.data.publishedAt === null,
        "Draft não deveria possuir publishedAt."
      );
    }
  );

  await runTest(
    "C25",
    "createChapter adiciona capítulo no final",
    async () => {
      const result =
        await chapterService.getChapterById(
          createdChapterId
        );

      assertSuccess(result);

      assert(
        result.data.position === 3,
        `Esperado position=3. Recebido: ${result.data.position}`
      );
    }
  );

  // =====================================================
  // UPDATE
  // =====================================================

  await runTest(
    "C26",
    "updateChapter atualiza título e conteúdo",
    async () => {
      const content =
        "A".repeat(500);

      const result =
        await chapterService.updateChapter(
          createdChapterId,
          {
            title:
              "  Capítulo de Teste  ",
            content
          }
        );

      assertSuccess(result);

      assert(
        result.data.title ===
          "Capítulo de Teste",
        "Título não foi normalizado."
      );

      assert(
        result.data.content ===
          content,
        "Conteúdo não foi atualizado."
      );
    }
  );

  await runTest(
    "C27",
    "updateChapter permite limpar título e conteúdo em draft",
    async () => {
      const result =
        await chapterService.updateChapter(
          createdChapterId,
          {
            title: "",
            content: ""
          }
        );

      assertSuccess(result);

      assert(
        result.data.title === null,
        "Título deveria ser null."
      );

      assert(
        result.data.content === null,
        "Conteúdo deveria ser null."
      );
    }
  );

  await runTest(
    "C28",
    "updateChapter rejeita objeto vazio",
    async () => {
      const result =
        await chapterService.updateChapter(
          createdChapterId,
          {}
        );

      assertError(
        result,
        "VALIDATION_ERROR"
      );
    }
  );

  await runTest(
    "C29",
    "updateChapter rejeita alteração de position",
    async () => {
      const result =
        await chapterService.updateChapter(
          createdChapterId,
          {
            position: 1
          }
        );

      assertError(
        result,
        "VALIDATION_ERROR"
      );
    }
  );

  await runTest(
    "C30",
    "updateChapter rejeita alteração de status",
    async () => {
      const result =
        await chapterService.updateChapter(
          createdChapterId,
          {
            status: "published"
          }
        );

      assertError(
        result,
        "VALIDATION_ERROR"
      );
    }
  );

  await runTest(
    "C31",
    "updateChapter rejeita alteração de bookId",
    async () => {
      const result =
        await chapterService.updateChapter(
          createdChapterId,
          {
            bookId:
              DRAFT_BOOK_ID
          }
        );

      assertError(
        result,
        "VALIDATION_ERROR"
      );
    }
  );

  await runTest(
    "C32",
    "updateChapter rejeita ID inexistente",
    async () => {
      const result =
        await chapterService.updateChapter(
          "99999999-9999-9999-9999-999999999999",
          {
            title: "Teste"
          }
        );

      assertError(
        result,
        "NOT_FOUND"
      );
    }
  );

  // =====================================================
  // PUBLICAÇÃO
  // =====================================================

  await runTest(
    "C33",
    "publishChapter exige título",
    async () => {
      await chapterService.updateChapter(
        createdChapterId,
        {
          title: null,
          content:
            "A".repeat(500)
        }
      );

      const result =
        await chapterService.publishChapter(
          createdChapterId
        );

      assertError(
        result,
        "VALIDATION_ERROR"
      );
    }
  );

  await runTest(
    "C34",
    "publishChapter exige no mínimo 500 caracteres",
    async () => {
      await chapterService.updateChapter(
        createdChapterId,
        {
          title: "Capítulo",
          content:
            "A".repeat(499)
        }
      );

      const result =
        await chapterService.publishChapter(
          createdChapterId
        );

      assertError(
        result,
        "VALIDATION_ERROR"
      );
    }
  );

  await runTest(
    "C35",
    "publishChapter rejeita conteúdo acima de 15000 caracteres",
    async () => {
      await chapterService.updateChapter(
        createdChapterId,
        {
          title: "Capítulo",
          content:
            "A".repeat(15001)
        }
      );

      const result =
        await chapterService.publishChapter(
          createdChapterId
        );

      assertError(
        result,
        "VALIDATION_ERROR"
      );
    }
  );

  await runTest(
    "C36",
    "publishChapter aceita conteúdo com exatamente 500 caracteres",
    async () => {
      await chapterService.updateChapter(
        createdChapterId,
        {
          title: "Capítulo Publicável",
          content:
            "A".repeat(500)
        }
      );

      const result =
        await chapterService.publishChapter(
          createdChapterId
        );

      assertSuccess(result);

      assert(
        result.data.status ===
          "published",
        "Capítulo não foi publicado."
      );

      assert(
        result.data.publishedAt !== null,
        "publishedAt não foi definido."
      );
    }
  );

  let originalPublishedAt = null;

  await runTest(
    "C37",
    "publishChapter preserva publishedAt se já publicado",
    async () => {
      const first =
        await chapterService.getChapterById(
          createdChapterId
        );

      assertSuccess(first);

      originalPublishedAt =
        first.data.publishedAt;

      const second =
        await chapterService.publishChapter(
          createdChapterId
        );

      assertSuccess(second);

      assert(
        second.data.publishedAt ===
          originalPublishedAt,
        "publishedAt foi alterado na republicação."
      );
    }
  );

  // =====================================================
  // EXCLUSÃO SEQUENCIAL
  // =====================================================

  let chapter4Id = null;
  let chapter5Id = null;

  await runTest(
    "C38",
    "cria capítulos adicionais para testar exclusão sequencial",
    async () => {
      const fourth =
        await chapterService.createChapter(
          PUBLISHED_BOOK_ID,
          {
            title: "Capítulo 4",
            content: "Teste"
          }
        );

      assertSuccess(fourth);

      chapter4Id =
        fourth.data.id;

      assert(
        fourth.data.position === 4,
        `Esperado position=4. Recebido: ${fourth.data.position}`
      );

      const fifth =
        await chapterService.createChapter(
          PUBLISHED_BOOK_ID,
          {
            title: "Capítulo 5",
            content: "Teste"
          }
        );

      assertSuccess(fifth);

      chapter5Id =
        fifth.data.id;

      assert(
        fifth.data.position === 5,
        `Esperado position=5. Recebido: ${fifth.data.position}`
      );
    }
  );

  await runTest(
    "C39",
    "deleteChapter remove capítulo selecionado e posteriores",
    async () => {
      const result =
        await chapterService.deleteChapter(
          chapter4Id
        );

      assertSuccess(result);

      assert(
        result.data.id ===
          chapter4Id,
        "ID principal excluído incorreto."
      );

      assert(
        Array.isArray(
          result.data.deletedIds
        ),
        "deletedIds não é um array."
      );

      assert(
        result.data.deletedIds.includes(
          chapter4Id
        ),
        "Capítulo selecionado não aparece em deletedIds."
      );

      assert(
        result.data.deletedIds.includes(
          chapter5Id
        ),
        "Capítulo posterior não aparece em deletedIds."
      );
    }
  );

  await runTest(
    "C40",
    "capítulo selecionado não existe após exclusão",
    async () => {
      const result =
        await chapterService.getChapterById(
          chapter4Id
        );

      assertError(
        result,
        "NOT_FOUND"
      );
    }
  );

  await runTest(
    "C41",
    "capítulo posterior também não existe após exclusão",
    async () => {
      const result =
        await chapterService.getChapterById(
          chapter5Id
        );

      assertError(
        result,
        "NOT_FOUND"
      );
    }
  );

  await runTest(
    "C42",
    "capítulos anteriores permanecem após exclusão",
    async () => {
      const result =
        await chapterService.getChapterById(
          createdChapterId
        );

      assertSuccess(result);

      assert(
        result.data.position === 3,
        "Capítulo anterior foi alterado."
      );
    }
  );

  await runTest(
    "C43",
    "novo capítulo reutiliza próxima posição contínua",
    async () => {
      const result =
        await chapterService.createChapter(
          PUBLISHED_BOOK_ID,
          {
            title:
              "Novo Capítulo 4",
            content: "Teste"
          }
        );

      assertSuccess(result);

      chapter4Id =
        result.data.id;

      assert(
        result.data.position === 4,
        `Esperado position=4. Recebido: ${result.data.position}`
      );
    }
  );

  await runTest(
    "C44",
    "deleteChapter rejeita UUID inexistente",
    async () => {
      const result =
        await chapterService.deleteChapter(
          "99999999-9999-9999-9999-999999999999"
        );

      assertError(
        result,
        "NOT_FOUND"
      );
    }
  );

  // =====================================================
  // NORMALIZAÇÃO
  // =====================================================

  await runTest(
    "C45",
    "capítulo possui todos os campos normalizados",
    async () => {
      const result =
        await chapterService.getChapterById(
          PUBLISHED_CHAPTER_ID
        );

      assertSuccess(result);

      const chapter =
        result.data;

      const expectedFields = [
        "id",
        "bookId",
        "title",
        "content",
        "status",
        "position",
        "publishedAt",
        "createdAt",
        "updatedAt"
      ];

      for (const field of expectedFields) {
        assert(
          Object.prototype.hasOwnProperty.call(
            chapter,
            field
          ),
          `Campo ausente: ${field}`
        );
      }
    }
  );

  // =====================================================
  // LIMPEZA
  // =====================================================

  await runTest(
    "C46",
    "remove capítulos criados durante os testes",
    async () => {
      const result =
        await chapterService.deleteChapter(
          createdChapterId
        );

      assertSuccess(result);
    }
  );

  await logout();

  // =====================================================
  // RESUMO
  // =====================================================

  const passed =
    results.filter(
      (result) => result.passed
    ).length;

  const failed =
    results.length - passed;

  console.log("");
  console.log("=== RESUMO ===");

  console.table(results);

  console.log(
    `Aprovados: ${passed}`
  );

  console.log(
    `Falharam: ${failed}`
  );

  console.log(
    `Total: ${results.length}`
  );

  if (failed === 0) {
    console.log(
      "✅ Todos os testes do chapterService Mock foram aprovados."
    );
  } else {
    console.warn(
      "⚠️ Existem testes que precisam de correção."
    );
  }
}

runAllTests();