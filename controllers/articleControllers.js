import { v4 as uuidv4 } from "uuid";

const CreateArticle = async (req, res) => {
  let { title, content, tagIds } = req.body;

  // Get author from authenticated user
  const author = req.user?.name || req.user?.username || req.user?.id;

  if (!author) {
    return res.status(400).send({ success: false, message: "Invalid user" });
  }

  // Default tag logic
  if (!Array.isArray(tagIds) || tagIds.length === 0) {
    tagIds = [13]; // General tag ID
  }

  if (tagIds.length > 3) {
    tagIds = tagIds.slice(0, 3);
  }

  const articleId = uuidv4();
  const connection = await req.server.mysql.getConnection();

  try {
    await connection.beginTransaction();

    const insertArticleQuery = `
      INSERT INTO articles (id, title, author, content, date_published, last_updated)
      VALUES (?, ?, ?, ?, NOW(), NOW())
    `;
    await connection.query(insertArticleQuery, [
      articleId,
      title,
      author,
      content,
    ]);

    const insertTagQuery = `
      INSERT INTO article_tags (article_id, tag_id)
      VALUES (?, ?)
    `;
    for (const tagId of tagIds) {
      await connection.query(insertTagQuery, [articleId, tagId]);
    }

    await connection.commit();

    return res.status(201).send({
      success: true,
      message: "Article created successfully",
      articleId,
    });
  } catch (error) {
    await connection.rollback();
    req.log.error(error);
    return res.status(500).send({
      success: false,
      message: "Failed to create article",
    });
  } finally {
    connection.release();
  }
};

const ReadAllArticle = async (req, res) => {
  try {
    let { startDate, endDate, tags } = req.query;
    let filters = [];
    let params = [];

    if (startDate) {
      filters.push("DATE(a.date_published) >= ?");
      params.push(startDate);
    }
    if (endDate) {
      filters.push("DATE(a.date_published) <= ?");
      params.push(endDate);
    }
    if (tags) {
      // tags are comma separated string, split to array
      const tagsArr = tags.split(",").map((tag) => tag.trim());
      filters.push(
        `a.id IN (
          SELECT article_id FROM article_tags at
          JOIN tags t ON at.tag_id = t.id
          WHERE t.name IN (${tagsArr.map(() => "?").join(",")})
          GROUP BY article_id
          HAVING COUNT(DISTINCT t.name) = ?
        )`
      );
      params.push(...tagsArr);
      params.push(tagsArr.length);
    }

    const whereClause =
      filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    const query = `
      SELECT 
        a.id, a.title, a.author, a.content, a.date_published, a.last_updated,
        GROUP_CONCAT(t.name) AS tags
      FROM articles a
      LEFT JOIN article_tags at ON a.id = at.article_id
      LEFT JOIN tags t ON at.tag_id = t.id
      ${whereClause}
      GROUP BY a.id
      ORDER BY a.date_published DESC
    `;

    const [rows] = await req.server.mysql.query(query, params);

    const articles = rows.map((article) => ({
      ...article,
      tags: article.tags ? article.tags.split(",") : [],
    }));

    return res.send({
      success: true,
      message: filters.length
        ? "Filtered articles retrieved successfully"
        : "Got all articles with tags",
      data: articles,
    });
  } catch (error) {
    console.error("DB error:", error);
    return res.status(500).send({
      success: false,
      message: error.message,
    });
  }
};

const ReadOneArticle = async (req, res) => {
  try {
    const articleId = req.params.id;
    const query = `
      SELECT 
        a.id, a.title, a.author, a.content, a.date_published, a.last_updated,
        GROUP_CONCAT(t.name) AS tags
      FROM articles a
      LEFT JOIN article_tags at ON a.id = at.article_id
      LEFT JOIN tags t ON at.tag_id = t.id
      WHERE a.id = ?
      GROUP BY a.id;
    `;
    const [rows] = await req.server.mysql.query(query, [articleId]);

    if (rows.length === 0)
      return res
        .code(404)
        .send({ success: false, message: "Article Not Found" });

    const article = rows[0];
    article.tags = article.tags ? article.tags.split(",") : [];
    return res.code(200).send({
      success: true,
      message: "Article Found",
      data: article,
    });
  } catch (error) {
    return res.code(500).send({ success: false, message: error.message });
  }
};

const UpdateArticle = async (req, res) => {
  const articleId = req.params.id;
  const { title, author, content, tagIds } = req.body;

  const connection = await req.server.mysql.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Check if article exists
    const [check] = await connection.query(
      "SELECT id, author FROM articles WHERE id = ?",
      [articleId]
    );

    if (check.length === 0) {
      await connection.release();
      return res
        .code(404)
        .send({ success: false, message: "Article not found" });
    }

    const article = check[0];

    // 2. Author check
    const requestingUser = req.user?.name || req.user?.username || req.user?.id;
    if (requestingUser !== article.author) {
      await connection.release();
      return res.code(403).send({
        success: false,
        message: "You are not authorized to update this article",
      });
    }

    // 3. Dynamically build the update query
    const fields = [];
    const values = [];

    if (title) {
      fields.push("title = ?");
      values.push(title);
    }
    if (author) {
      fields.push("author = ?");
      values.push(author);
    }
    if (content) {
      fields.push("content = ?");
      values.push(content);
    }

    if (fields.length > 0) {
      fields.push("last_updated = NOW()");
      const updateQuery = `UPDATE articles SET ${fields.join(
        ", "
      )} WHERE id = ?`;
      values.push(articleId);

      await connection.query(updateQuery, values);
    }

    // 4. Tags (optional)
    if (Array.isArray(tagIds)) {
      const finalTags = tagIds.slice(0, 3);

      await connection.query("DELETE FROM article_tags WHERE article_id = ?", [
        articleId,
      ]);

      const insertTagQuery = `INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)`;
      for (const tagId of finalTags) {
        await connection.query(insertTagQuery, [articleId, tagId]);
      }
    }

    await connection.commit();
    return res.code(200).send({
      success: true,
      message: "Article updated successfully",
    });
  } catch (error) {
    await connection.rollback();
    req.log.error(error);
    return res.code(500).send({
      success: false,
      message: "Failed to update article",
    });
  } finally {
    connection.release();
  }
};

const DeleteArticle = async (req, res) => {
  const articleId = req.params.id;
  const requestingUser = req.user?.name || req.user?.username || req.user?.id;

  const connection = await req.server.mysql.getConnection();

  try {
    // 1. Check if the article exists
    const [articles] = await connection.query(
      "SELECT author FROM articles WHERE id = ?",
      [articleId]
    );

    if (articles.length === 0) {
      return res
        .code(404)
        .send({ success: false, message: "Article not found" });
    }

    const article = articles[0];

    // 2. Check if the current user is the author
    if (article.author !== requestingUser) {
      return res.code(403).send({
        success: false,
        message: "You are not authorized to delete this article",
      });
    }

    await connection.beginTransaction();

    // 3. Delete from article_tags table (if using relational tags)
    await connection.query("DELETE FROM article_tags WHERE article_id = ?", [
      articleId,
    ]);

    // 4. Delete the article
    await connection.query("DELETE FROM articles WHERE id = ?", [articleId]);

    await connection.commit();

    return res.code(200).send({
      success: true,
      message: "Article deleted successfully",
    });
  } catch (error) {
    await connection.rollback();
    req.log.error(error);
    return res.code(500).send({
      success: false,
      message: "Failed to delete article",
    });
  } finally {
    connection.release();
  }
};

export {
  CreateArticle,
  ReadAllArticle,
  ReadOneArticle,
  UpdateArticle,
  DeleteArticle,
};
