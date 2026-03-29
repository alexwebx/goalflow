# Правила деплоя на GitHub Pages

Этот проект публикуется на `GitHub Pages`, поэтому деплой должен учитывать ограничения статического хостинга.

## Обязательные правила

### 1. Router

Нужно использовать `HashRouter`, а не `BrowserRouter`.

Причина:

- GitHub Pages не делает backend fallback на `index.html`
- `HashRouter` корректно работает в статическом окружении

### 2. Vite base

В `vite.config.ts` должен быть:

```ts
base: "/goalflow/"
```

`base` должен совпадать с именем репозитория.

## Схема деплоя

Используется схема:

- сборка приложения
- публикация содержимого `dist`
- деплой в ветку `gh-pages`

Workflow:

- `.github/workflows/deploy.yml`

## Что не использовать

В этом проекте нельзя использовать:

- `configure-pages`
- `deploy-pages`

Причина:

- это часто ломает деплой при неактивированном Pages
- может давать ошибки `Get Pages site failed`
- может давать `Resource not accessible by integration`

## Что нужно включить на GitHub

Один раз вручную:

1. Открыть `Settings -> Pages`
2. Выбрать `Deploy from a branch`
3. Указать ветку `gh-pages`
4. Указать папку `/ (root)`
5. Сохранить

## Порядок деплоя

1. Проверить локальную сборку:

```bash
npm run build
```

2. Сделать commit в `main`
3. Сделать push
4. Дождаться workflow `Deploy to GitHub Pages`
5. Проверить обновление ветки `gh-pages`

Сайт будет доступен по адресу:

```text
https://alexwebx.github.io/goalflow/#/
```
