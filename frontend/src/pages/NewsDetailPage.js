import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Spinner, Badge, Button } from 'react-bootstrap';
import { newsAPI } from '../services/api';
import BlockPreview from '../components/BlockEditor/preview/BlockPreview';
import { useAuth } from '../contexts/AuthContext';

/* SVG-определение blob-маски, скрытое от экрана */
const BlobClipDef = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }}>
    <defs>
      <clipPath id="news-blob-mask" clipPathUnits="objectBoundingBox">
        <path d="
          M 0.48,0.04
          C 0.59,-0.02 0.75,0.00 0.85,0.12
          C 0.95,0.24 0.97,0.40 0.95,0.54
          C 0.93,0.68 1.02,0.78 0.92,0.88
          C 0.82,0.98 0.65,1.02 0.50,1.00
          C 0.35,0.98 0.18,1.04 0.08,0.92
          C -0.02,0.80 0.04,0.65 0.05,0.50
          C 0.06,0.35 -0.01,0.20 0.10,0.10
          C 0.21,0.00 0.37,0.10 0.48,0.04 Z
        " />
      </clipPath>
    </defs>
  </svg>
);

const WaveBorder = () => (
  <svg
    viewBox="0 0 1200 36"
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="none"
    style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '36px', display: 'block' }}
  >
    <path
      d="M 0,18 C 100,4 200,32 300,18 C 400,4 500,32 600,18 C 700,4 800,32 900,18 C 1000,4 1100,32 1200,18"
      fill="none"
      stroke="#1a1a2e"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

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

  const formattedDate = news.published_at
    ? new Date(news.published_at).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <Container className="py-4">
      <BlobClipDef />
      {/* Навигация */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Link
          to="/news"
          className="d-flex align-items-center gap-2 text-dark text-decoration-none fw-medium"
          style={{ fontSize: '0.95rem' }}
        >
          <span style={{ fontSize: '1.1rem' }}>←</span> Назад к новостям
        </Link>
        {isAdmin && (
          <Button
            as={Link}
            to={`/admin/news/${id}/edit`}
            variant="primary"
            style={{ borderRadius: '20px', padding: '6px 20px' }}
          >
            Редактировать
          </Button>
        )}
      </div>

      {/* Hero-блок */}
      <div
        style={{
          background: 'linear-gradient(135deg, #a8edea 0%, #7de0e6 100%)',
          borderRadius: '32px',
          padding: '2.5rem 2.5rem 3rem 2.5rem',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '2.5rem',
          minHeight: '200px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '2rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Левая часть: метаданные */}
          <div style={{ flex: '1 1 300px', zIndex: 1 }}>
            <h1 style={{ fontWeight: '800', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#1a1a2e', lineHeight: 1.2, marginBottom: '0.75rem' }}>
              {news.title}
            </h1>

            {formattedDate && (
              <p style={{ color: '#2d5a5e', fontSize: '0.9rem', marginBottom: '0.75rem', fontWeight: '500' }}>
                {formattedDate}
              </p>
            )}

            {news.short_description && (
              <p style={{ color: '#1a1a2e', fontSize: '1rem', marginBottom: '0.75rem', maxWidth: '500px' }}>
                {news.short_description}
              </p>
            )}

            {/* Теги */}
            {news.tags && news.tags.length > 0 && (
              <div className="d-flex flex-wrap gap-2 mt-2">
                {news.tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    style={{
                      background: 'rgba(26,26,46,0.12)',
                      color: '#1a1a2e',
                      fontWeight: '500',
                      fontSize: '0.8rem',
                      padding: '4px 10px',
                      borderRadius: '12px',
                    }}
                  >
                    {tag.name}
                  </Badge>
                ))}
                {isAdmin && !news.is_published && (
                  <Badge bg="warning" text="dark">Черновик</Badge>
                )}
              </div>
            )}
          </div>

          {/* Правая часть: изображение с blob-маской */}
          {news.image && (
            <div style={{ flex: '0 0 auto', zIndex: 1 }}>
              <div
                style={{
                  width: 'clamp(200px, 30vw, 320px)',
                  height: 'clamp(170px, 25vw, 270px)',
                  position: 'relative',
                }}
              >
                <img
                  src={news.image}
                  alt={news.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    clipPath: 'url(#news-blob-mask)',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Волна снизу */}
        <WaveBorder />
      </div>

      {/* Контент */}
      {news.uses_block_editor ? (
        <BlockPreview blocks={news.content_blocks || []} />
      ) : (
        <div
          className="preview-text news-content"
          dangerouslySetInnerHTML={{ __html: news.content }}
        />
      )}
    </Container>
  );
};

export default NewsDetailPage;
