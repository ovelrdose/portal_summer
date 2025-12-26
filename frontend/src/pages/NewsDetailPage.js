import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Spinner, Badge, Button } from 'react-bootstrap';
import { newsAPI } from '../services/api';
import BlockPreview from '../components/BlockEditor/preview/BlockPreview';
import { useAuth } from '../contexts/AuthContext';

const NewsDetailPage = () => {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadNews = async () => {
    try {
      const response = await newsAPI.getNewsItem(id);
      setNews(response.data);
    } catch (error) {
      console.error('Error loading news:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" />
      </Container>
    );
  }

  if (!news) {
    return (
      <Container className="py-5 text-center">
        <h2>Новость не найдена</h2>
        <Button as={Link} to="/news" variant="primary">
          К списку новостей
        </Button>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Button as={Link} to="/news" variant="outline-secondary">
          Назад к новостям
        </Button>
        {isAdmin && (
          <Button as={Link} to={`/admin/news/${id}/edit`} variant="outline-primary">
            Редактировать
          </Button>
        )}
      </div>

      <h1 className="mb-3">{news.title}</h1>

      <div className="mb-3">
        {news.tags?.map((tag) => (
          <Badge key={tag.id} bg="info" className="me-2">
            {tag.name}
          </Badge>
        ))}
        {isAdmin && !news.is_published && (
          <Badge bg="warning" className="ms-2">Черновик</Badge>
        )}
      </div>

      <p className="text-muted mb-4">
        {new Date(news.published_at).toLocaleDateString('ru-RU', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </p>

      {news.uses_block_editor ? (
        <BlockPreview blocks={news.content_blocks || []} />
      ) : (
        <div
          className="news-content"
          dangerouslySetInnerHTML={{ __html: news.content }}
        />
      )}
    </Container>
  );
};

export default NewsDetailPage;
