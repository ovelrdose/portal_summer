# Инструкция по завершению изменений фронтенда

## ✅ Уже выполнено:

1. ✅ Создан `frontend/src/utils/dateUtils.js`
2. ✅ Создан `frontend/src/components/CourseSchedule.js`
3. ✅ Обновлен `frontend/src/services/api.js` (добавлен getCourseSchedule)

## 📝 Необходимо выполнить:

### 1. Обновить CourseEditor.js

Файл: `frontend/src/pages/admin/CourseEditor.js`

#### 1.1 Добавить импорт в начало файла (после строки 8):
```javascript
import { formatDateTimeLocal, dateTimeLocalToISO } from '../../utils/dateUtils';
```

#### 1.2 Найти строку 38 и изменить sectionForm state:
```javascript
// Было:
const [sectionForm, setSectionForm] = useState({ title: '', order: 0 });

// Должно быть:
const [sectionForm, setSectionForm] = useState({ title: '', order: 0, publish_datetime: '' });
```

#### 1.3 Найти функцию `openSectionModal` (около строки 239) и изменить её:
```javascript
const openSectionModal = (section = null) => {
  if (section) {
    setEditingSection(section);
    setSectionForm({
      title: section.title,
      order: section.order,
      publish_datetime: formatDateTimeLocal(section.publish_datetime) || ''
    });
  } else {
    setEditingSection(null);
    setSectionForm({ title: '', order: sections.length, publish_datetime: '' });
  }
  setShowSectionModal(true);
};
```

#### 1.4 Найти функцию `handleSaveSection` (около строки 250) и изменить её:
```javascript
const handleSaveSection = async () => {
  try {
    const data = {
      title: sectionForm.title,
      order: isNaN(sectionForm.order) ? 0 : sectionForm.order,
      publish_datetime: sectionForm.publish_datetime
        ? dateTimeLocalToISO(sectionForm.publish_datetime)
        : null,
    };
    if (editingSection) {
      await coursesAPI.updateSection(editingSection.id, data);
    } else {
      await coursesAPI.createSection({ ...data, course: parseInt(id, 10) });
    }
    loadCourse();
    setShowSectionModal(false);
  } catch (error) {
    console.error('Section save error:', error.response?.data || error);
    const errorMsg = error.response?.data
      ? JSON.stringify(error.response.data)
      : 'Ошибка сохранения раздела';
    setError(errorMsg);
  }
};
```

#### 1.5 Найти Section Modal JSX (около строки 616) и добавить поле даты ПЕРЕД </Modal.Body>:
```javascript
<Form.Group>
  <Form.Label>Дата и время открытия (опционально)</Form.Label>
  <Form.Control
    type="datetime-local"
    value={sectionForm.publish_datetime}
    onChange={(e) => setSectionForm({ ...sectionForm, publish_datetime: e.target.value })}
  />
  <Form.Text className="text-muted">
    Если указано, раздел будет скрыт для студентов до этой даты
  </Form.Text>
</Form.Group>
```

---

### 2. Обновить CourseDetailPage.js

Файл: `frontend/src/pages/portal/CourseDetailPage.js`

#### 2.1 Добавить импорты в начало файла:
```javascript
import CourseSchedule from '../../components/CourseSchedule';
import { isContentLocked, formatDateTimeDisplay } from '../../utils/dateUtils';
```

#### 2.2 Добавить state для polling (после существующих useState):
```javascript
const [pollingInterval, setPollingInterval] = useState(null);
```

#### 2.3 Добавить useEffect для polling (после существующих useEffect):
```javascript
useEffect(() => {
  // Set up polling every 60 seconds
  if (course && (course.is_subscribed || canEdit)) {
    const interval = setInterval(() => {
      loadCourse();
    }, 60000); // 60 seconds

    setPollingInterval(interval);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }
}, [course?.id, course?.is_subscribed, canEdit]);
```

#### 2.4 Добавить компонент CourseSchedule в JSX (после описания курса, перед разделами):
```javascript
{/* Course Schedule */}
{(course.is_subscribed || canEdit) && (
  <CourseSchedule courseId={id} />
)}
```

#### 2.5 Обновить фильтрацию разделов (найти course.sections?.length и изменить):
```javascript
{course.sections
  .filter((s) => {
    // Teachers and admins see all sections
    if (canEdit) return s.is_published;
    // Students only see published and unlocked sections
    return s.is_published && !isContentLocked(s.publish_datetime);
  })
  .map((section, index) => (
```

#### 2.6 Обновить заголовок раздела (в Accordion.Header):
```javascript
<Accordion.Header>
  <div className="d-flex align-items-center">
    {section.is_locked && !canEdit && (
      <i className="bi bi-lock-fill text-muted me-2"
         title={`Откроется ${formatDateTimeDisplay(section.unlock_datetime)}`}></i>
    )}
    <span>{section.title}</span>
    {canEdit && section.publish_datetime && isContentLocked(section.publish_datetime) && (
      <Badge bg="secondary" className="ms-2">
        <i className="bi bi-lock"></i> До {formatDateTimeDisplay(section.publish_datetime)}
      </Badge>
    )}
  </div>
</Accordion.Header>
```

#### 2.7 Обновить фильтрацию элементов и отображение (в Accordion.Body):
```javascript
<Accordion.Body>
  {section.elements
    ?.filter((e) => {
      if (canEdit) return e.is_published;
      return e.is_published && !isContentLocked(e.publish_datetime);
    })
    .map((element) => (
      <div key={element.id} className="mb-3 pb-3 border-bottom">
        {element.title && (
          <h5>
            {element.is_locked && !canEdit && (
              <i className="bi bi-lock-fill text-muted me-2"
                 title={`Откроется ${formatDateTimeDisplay(element.unlock_datetime)}`}></i>
            )}
            {element.title}
            {canEdit && element.data?.publish_datetime && isContentLocked(element.data.publish_datetime) && (
              <Badge bg="secondary" className="ms-2">
                <i className="bi bi-lock"></i> До {formatDateTimeDisplay(element.data.publish_datetime)}
              </Badge>
            )}
          </h5>
        )}

        {/* Check if element is locked for students */}
        {element.is_locked && !canEdit ? (
          <Alert variant="info" className="d-flex align-items-center">
            <i className="bi bi-lock-fill fs-1 me-3"></i>
            <div>
              <strong>Этот элемент станет доступен</strong>
              <br />
              {formatDateTimeDisplay(element.unlock_datetime)}
            </div>
          </Alert>
        ) : (
          <>
            {/* СУЩЕСТВУЮЩИЙ КОД ОТОБРАЖЕНИЯ ЭЛЕМЕНТОВ (text, video, image, link, homework) */}
            {/* НЕ УДАЛЯЙТЕ ЕГО, ПРОСТО ОБЕРНИТЕ В ЭТОТ else */}
          </>
        )}
      </div>
    ))}
</Accordion.Body>
```

---

### 3. Установить Bootstrap Icons

```bash
cd frontend
npm install bootstrap-icons
```

Затем добавить в `frontend/src/index.js` или `frontend/src/App.js`:
```javascript
import 'bootstrap-icons/font/bootstrap-icons.css';
```

---

### 4. Выполнить миграции на backend

```bash
cd backend
python manage.py migrate courses
```

---

### 5. Протестировать сборку

```bash
cd frontend
npm run build
```

---

## 📌 Дополнительно (опционально)

Если вы хотите добавить поле `publish_datetime` в формы блоков (TextBlock, VideoBlock и т.д.):

В каждом файле блока (`frontend/src/components/BlockEditor/blocks/*.js`):

1. Добавить импорт:
```javascript
import { formatDateTimeLocal, dateTimeLocalToISO } from '../../../utils/dateUtils';
```

2. Добавить поле в форму (в конце формы, перед закрывающим тегом):
```javascript
<Form.Group className="mb-3">
  <Form.Label>Дата и время открытия (опционально)</Form.Label>
  <Form.Control
    type="datetime-local"
    value={formatDateTimeLocal(data.publish_datetime) || ''}
    onChange={(e) => onChange({
      ...data,
      publish_datetime: e.target.value ? dateTimeLocalToISO(e.target.value) : null
    })}
  />
  <Form.Text className="text-muted">
    Если указано, элемент будет скрыт для студентов до этой даты
  </Form.Text>
</Form.Group>
```

Применить это к файлам:
- TextBlock.js
- VideoBlock.js
- ImageBlock.js
- LinkBlock.js
- HomeworkBlock.js

---

## ✅ Готово!

После выполнения всех шагов функционал отложенной публикации будет полностью готов к использованию.
