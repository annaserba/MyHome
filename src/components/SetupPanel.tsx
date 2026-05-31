export function SetupPanel() {
  return (
    <section className="setup">
      <h2>Нужен OAuth-токен Яндекса</h2>
      <p>
        Создайте файл .env по примеру .env.example и добавьте
        YANDEX_OAUTH_TOKEN. После этого перезапустите сервер.
      </p>
    </section>
  );
}
