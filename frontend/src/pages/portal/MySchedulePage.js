import React, { useState, useEffect, useMemo } from 'react';
import { Container, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { coursesAPI } from '../../services/api';

// Get "YYYY-MM-DD" from ISO string
const toDateStr = (isoString) => {
  if (!isoString) return '';
  return new Date(isoString).toISOString().slice(0, 10);
};

// Today as "YYYY-MM-DD"
const todayStr = () => new Date().toISOString().slice(0, 10);

// Date N days from today as "YYYY-MM-DD"
const futureDateStr = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

// "Пн, 19 февраля 2026"
const formatDayHeader = (dateStr) => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

// "14:30"
const formatTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

// "19.02.2026 14:30"
const formatDeadlineFull = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }) + ' ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

const UnlockEvent = ({ event }) => (
  <div className="schedule-event schedule-event--unlock">
    <div className="schedule-event-accent" />
    <div className="schedule-event-icon">
      <i className="bi bi-unlock-fill" />
    </div>
    <div className="schedule-event-body">
      <div className="schedule-event-title">
        {event.element_title || 'Открытие раздела'}
      </div>
      <div className="schedule-event-meta">
        <Link to={`/portal/courses/${event.course_id}`} className="schedule-event-course">
          {event.course_title}
        </Link>
        <span className="schedule-event-dot">·</span>
        <span>{event.section_title}</span>
      </div>
    </div>
    <div className="schedule-event-right">
      <span className="schedule-event-time">{formatTime(event.unlock_datetime)}</span>
      <span className="schedule-event-badge schedule-event-badge--unlock">Открытие</span>
    </div>
  </div>
);

const HomeworkEvent = ({ event }) => (
  <div className="schedule-event schedule-event--homework">
    <div className="schedule-event-accent" />
    <div className="schedule-event-icon">
      <i className="bi bi-clipboard-check-fill" />
    </div>
    <div className="schedule-event-body">
      <div className="schedule-event-title">{event.element_title}</div>
      <div className="schedule-event-meta">
        <Link to={`/portal/courses/${event.course_id}`} className="schedule-event-course">
          {event.course_title}
        </Link>
        <span className="schedule-event-dot">·</span>
        <span>{event.section_title}</span>
      </div>
    </div>
    <div className="schedule-event-right">
      <span className="schedule-event-time">{formatTime(event.deadline)}</span>
      <span className="schedule-event-badge schedule-event-badge--homework">
        {event.submission_status === 'revision_requested' ? 'Доработка' : 'Дедлайн'}
      </span>
    </div>
  </div>
);

const OverdueEvent = ({ event }) => (
  <div className="schedule-event schedule-event--overdue">
    <div className="schedule-event-accent" />
    <div className="schedule-event-icon">
      <i className="bi bi-exclamation-triangle-fill" />
    </div>
    <div className="schedule-event-body">
      <div className="schedule-event-title">{event.element_title}</div>
      <div className="schedule-event-meta">
        <Link to={`/portal/courses/${event.course_id}`} className="schedule-event-course-danger">
          {event.course_title}
        </Link>
        <span className="schedule-event-dot">·</span>
        <span>{event.section_title}</span>
        <span className="schedule-event-dot">·</span>
        <span className="text-danger" style={{ fontSize: '0.78rem' }}>
          Дедлайн: {formatDeadlineFull(event.deadline)}
        </span>
      </div>
    </div>
    <div className="schedule-event-right">
      <span className="schedule-event-badge schedule-event-badge--overdue">
        {event.submission_status === 'revision_requested' ? 'Доработка' : 'Не сдано'}
      </span>
    </div>
  </div>
);

const MySchedulePage = () => {
  const [unlocks, setUnlocks] = useState([]);
  const [homeworks, setHomeworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [viewMode, setViewMode] = useState('period'); // 'day' | 'period'
  const [selectedDay, setSelectedDay] = useState(todayStr());
  const [dateFrom, setDateFrom] = useState(todayStr());
  const [dateTo, setDateTo] = useState(futureDateStr(7));

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      const response = await coursesAPI.getMySchedule();
      setUnlocks(response.data.unlocks || []);
      setHomeworks(response.data.homeworks || []);
    } catch (err) {
      console.error('Error loading my schedule:', err);
      setError('Не удалось загрузить расписание');
    } finally {
      setLoading(false);
    }
  };

  const setQuickRange = (days) => {
    setDateFrom(todayStr());
    setDateTo(futureDateStr(days));
    setViewMode('period');
  };

  const { overdueHomeworks, groupedEvents } = useMemo(() => {
    const overdueHomeworks = homeworks.filter(hw => hw.is_overdue);
    const activeHomeworks = homeworks.filter(hw => !hw.is_overdue);

    const isInRange = (dateIso) => {
      const d = toDateStr(dateIso);
      if (viewMode === 'day') return d === selectedDay;
      return d >= dateFrom && d <= dateTo;
    };

    const allEvents = [
      ...unlocks
        .filter(item => isInRange(item.unlock_datetime))
        .map(item => ({
          ...item,
          _type: 'unlock',
          _dateStr: toDateStr(item.unlock_datetime),
          _ts: item.unlock_datetime,
        })),
      ...activeHomeworks
        .filter(item => isInRange(item.deadline))
        .map(item => ({
          ...item,
          _type: 'homework',
          _dateStr: toDateStr(item.deadline),
          _ts: item.deadline,
        })),
    ];

    allEvents.sort((a, b) => new Date(a._ts) - new Date(b._ts));

    const groups = {};
    for (const ev of allEvents) {
      if (!groups[ev._dateStr]) groups[ev._dateStr] = [];
      groups[ev._dateStr].push(ev);
    }

    const groupedEvents = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
    return { overdueHomeworks, groupedEvents };
  }, [unlocks, homeworks, viewMode, selectedDay, dateFrom, dateTo]);

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5 text-center text-danger">{error}</Container>
    );
  }

  return (
    <Container className="py-5">

      {/* ── Header ── */}
      <div className="custom-section-header mb-4">
        <h1 className="custom-section-title">
          <i className="bi bi-calendar-week me-2" />
          Моё расписание
        </h1>
        <div className="d-flex gap-2">
          <button
            className={`btn btn-sm-custom rounded-pill ${viewMode === 'day' ? 'btn-custom-primary' : 'btn-custom-outline'}`}
            onClick={() => setViewMode('day')}
          >
            <i className="bi bi-calendar3 me-1" />
            День
          </button>
          <button
            className={`btn btn-sm-custom rounded-pill ${viewMode === 'period' ? 'btn-custom-primary' : 'btn-custom-outline'}`}
            onClick={() => setViewMode('period')}
          >
            <i className="bi bi-calendar-range me-1" />
            Период
          </button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="schedule-filter-bar mb-5">
        {viewMode === 'day' ? (
          <div className="d-flex align-items-center gap-3">
            <i className="bi bi-calendar3 schedule-filter-icon" />
            <input
              type="date"
              className="schedule-date-input"
              value={selectedDay}
              onChange={e => setSelectedDay(e.target.value)}
            />
          </div>
        ) : (
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <i className="bi bi-calendar-range schedule-filter-icon" />
            <input
              type="date"
              className="schedule-date-input"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
            <span className="schedule-filter-dash">—</span>
            <input
              type="date"
              className="schedule-date-input"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
            <div className="d-flex gap-2 ms-1">
              <button className="schedule-quick-btn" onClick={() => setQuickRange(0)}>Сегодня</button>
              <button className="schedule-quick-btn" onClick={() => setQuickRange(7)}>Неделя</button>
              <button className="schedule-quick-btn" onClick={() => setQuickRange(30)}>Месяц</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Overdue homeworks ── */}
      {overdueHomeworks.length > 0 && (
        <div className="mb-5">
          <div className="schedule-date-header schedule-date-header--overdue">
            <i className="bi bi-exclamation-triangle-fill me-2" />
            Просроченные задания
            <span className="schedule-date-count schedule-date-count--overdue">
              {overdueHomeworks.length}
            </span>
          </div>
          <div className="d-flex flex-column gap-2">
            {overdueHomeworks.map((item, idx) => (
              <OverdueEvent key={idx} event={item} />
            ))}
          </div>
        </div>
      )}

      {/* ── Grouped events ── */}
      {groupedEvents.length === 0 ? (
        <div className="schedule-empty">
          <i className="bi bi-calendar-x schedule-empty-icon" />
          <p className="schedule-empty-text">
            {viewMode === 'day'
              ? 'На этот день событий нет'
              : 'В выбранном периоде событий нет'}
          </p>
        </div>
      ) : (
        groupedEvents.map(([dateStr, events]) => (
          <div key={dateStr} className="mb-4">
            <div className="schedule-date-header">
              {formatDayHeader(dateStr)}
              <span className="schedule-date-count">{events.length}</span>
            </div>
            <div className="d-flex flex-column gap-2">
              {events.map((event, idx) =>
                event._type === 'unlock'
                  ? <UnlockEvent key={idx} event={event} />
                  : <HomeworkEvent key={idx} event={event} />
              )}
            </div>
          </div>
        ))
      )}

    </Container>
  );
};

export default MySchedulePage;
