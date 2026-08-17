const ru: {
  common: {
    brand: string;
    tagline: string;
    or: string;
    loading: string;
    noName: string;
    toGraph: string;
    profile: string;
    notifications: string;
    close: string;
    language: string;
  };
  landing: {
    svgAlt: string;
    demoQuery: string;
    demoMe: string;
    demoMatch: string;
    h1: string;
    subtitle: string;
    value1: string;
    value2: string;
    value3: string;
    signup: string;
    login: string;
  };
  auth: {
    login: {
      title: string;
      emailLabel: string;
      passwordLabel: string;
      submit: string;
      submitting: string;
      googleButton: string;
      noAccount: string;
      signupLink: string;
      invalidCredentials: string;
    };
    signup: {
      title: string;
      inviteBanner: string;
      nameLabel: string;
      namePlaceholder: string;
      headlineLabel: string;
      optional: string;
      headlinePlaceholder: string;
      emailLabel: string;
      passwordLabel: string;
      passwordPlaceholder: string;
      agreePrefix: string;
      agreeLink: string;
      submit: string;
      submitting: string;
      googleButton: string;
      haveAccount: string;
      loginLink: string;
      mustAgree: string;
      alreadyRegistered: string;
      confirmationSent: (email: string) => string;
    };
  };
  profile: {
    title: string;
    avatarAlt: string;
    uploadPhoto: string;
    uploading: string;
    avatarNeedsImage: string;
    avatarTooLarge: string;
    avatarSavedError: (message: string) => string;
    nameLabel: string;
    specialtyLabel: string;
    specialtyPlaceholder: string;
    contactsTitle: string;
    phoneLabel: string;
    whatsappLabel: string;
    instagramLabel: string;
    privacyTitle: string;
    shareContactsLabel: string;
    shareContactsHint: string;
    visibleInSearchLabel: string;
    visibleInSearchHint: string;
    networkVisibleLabel: string;
    networkVisibleHint: string;
    saved: string;
    save: string;
    saving: string;
    logout: string;
    blockedTitle: string;
    blockedEmpty: string;
    unblock: string;
  };
  graph: {
    loadingGraph: string;
    addContact: string;
    notificationsTitle: string;
    noNewRequests: string;
    requestBody: string;
    accept: string;
    decline: string;
    searchPlaceholder: string;
    searching: string;
    emptyNetworkBanner: string;
    invite: string;
    hintExpand: string;
    emptyState: string;
    infoPanelTitle: string;
    pathTo: (name: string) => string;
    backToGraph: string;
    searchingPath: string;
    noConfirmedPath: string;
    contactsCount: (n: string) => string;
    contactsTitle: string;
    noContactShare: string;
    recommendationsTitle: string;
    selectPersonHint: string;
    removeContact: string;
    removeConfirmTitle: (name: string) => string;
    removeConfirmBody: string;
    blockContact: string;
    blockConfirmTitle: (name: string) => string;
    blockConfirmBody: string;
    confirmYesRemove: string;
    confirmYesBlock: string;
    confirmCancel: string;
    actionFailed: string;
    modal: {
      title: string;
      searchIntro: string;
      searchPlaceholder: string;
      noResults: string;
      sendRequest: string;
      notInList: string;
      inviteIntro: string;
      whatsappLabel: string;
      pickContact: string;
      sendInvite: string;
      sending: string;
      backToSearch: string;
      linkReady: string;
      copy: string;
      copied: string;
      openWhatsappAgain: string;
      done: string;
      sentToPrefix: string;
      sentToSuffix: string;
    };
    errors: {
      alreadySent: string;
      inviteFailed: string;
    };
    whatsappInviteText: (link: string) => string;
  };
  invite: {
    checking: string;
    accepting: string;
    doneTitle: string;
    doneBody: string;
    invalidLink: string;
  };
  legal: {
    back: string;
    title: string;
    lastUpdated: (date: string) => string;
    section1: { title: string; items: string[] };
    section2: { title: string; body: string };
    section3: { title: string; items: string[] };
    section4: { title: string; body: string };
    section5: { title: string; before: string; linkText: string; after: string };
    section6: { title: string; body: string };
  };
} = {
  common: {
    brand: "Senim",
    tagline: "Специалисты, которых лично знают ваши знакомые — а не случайные люди из чата",
    or: "или",
    loading: "Загрузка…",
    noName: "Без имени",
    toGraph: "К графу",
    profile: "Профиль",
    notifications: "Уведомления",
    close: "Закрыть",
    language: "Язык",
  },
  landing: {
    svgAlt: "Схема: вы ищете фотографа, и граф подсвечивает его среди знакомых ваших знакомых",
    demoQuery: "фотограф",
    demoMe: "Вы",
    demoMatch: "Фотограф",
    h1: "Ваш круг знает нужного человека",
    subtitle: "Цепочка личных рекомендаций — вместо поиска наугад.",
    value1: "Только настоящие рекомендации",
    value2: "Больше доверия — больше клиентов",
    value3: "Поделились раз — помогаете постоянно",
    signup: "Зарегистрироваться",
    login: "Войти",
  },
  auth: {
    login: {
      title: "Вход",
      emailLabel: "Email",
      passwordLabel: "Пароль",
      submit: "Войти",
      submitting: "Входим…",
      googleButton: "Войти через Google",
      noAccount: "Нет аккаунта?",
      signupLink: "Зарегистрироваться",
      invalidCredentials: "Неверный email или пароль",
    },
    signup: {
      title: "Регистрация",
      inviteBanner: "Вас пригласили присоединиться к сети знакомств — после регистрации вы увидите заявку на связь.",
      nameLabel: "Имя",
      namePlaceholder: "Аслан Касымов",
      headlineLabel: "Профессия",
      optional: "(необязательно)",
      headlinePlaceholder: "Профессия",
      emailLabel: "Email",
      passwordLabel: "Пароль",
      passwordPlaceholder: "Минимум 6 символов",
      agreePrefix: "Я согласен(на) на",
      agreeLink: "обработку и хранение персональных данных",
      submit: "Зарегистрироваться",
      submitting: "Регистрируем…",
      googleButton: "Зарегистрироваться через Google",
      haveAccount: "Уже есть аккаунт?",
      loginLink: "Войти",
      mustAgree: "Нужно согласиться на обработку персональных данных",
      alreadyRegistered: "Пользователь с таким email уже зарегистрирован",
      confirmationSent: (email: string) =>
        `Мы отправили письмо для подтверждения на ${email}. Перейдите по ссылке в письме, чтобы завершить регистрацию.`,
    },
  },
  profile: {
    title: "Профиль",
    avatarAlt: "Аватар",
    uploadPhoto: "Загрузить фото",
    uploading: "Загружаем…",
    avatarNeedsImage: "Нужен файл изображения",
    avatarTooLarge: "Файл больше 5 МБ",
    avatarSavedError: (message: string) => `Файл загружен, но не сохранился в профиле: ${message}`,
    nameLabel: "Имя",
    specialtyLabel: "Специализация",
    specialtyPlaceholder: "Профессия",
    contactsTitle: "Контакты",
    phoneLabel: "Телефон",
    whatsappLabel: "WhatsApp",
    instagramLabel: "Instagram",
    privacyTitle: "Приватность",
    shareContactsLabel: "Показывать мои контакты знакомым в графе",
    shareContactsHint: "Сначала заполните хотя бы один контакт",
    visibleInSearchLabel: "Показывать меня в поиске",
    visibleInSearchHint: "Меня можно будет найти по имени/специальности",
    networkVisibleLabel: "Показывать мою сеть посторонним",
    networkVisibleHint: "Кого я знаю, смогут раскрыть на графе другие — не только мои прямые контакты",
    saved: "Сохранено",
    save: "Сохранить",
    saving: "Сохраняем…",
    logout: "Выйти из аккаунта",
    blockedTitle: "Заблокированные",
    blockedEmpty: "Никого не заблокировано",
    unblock: "Разблокировать",
  },
  graph: {
    loadingGraph: "Загрузка графа…",
    addContact: "Добавить контакт",
    notificationsTitle: "Уведомления",
    noNewRequests: "Новых заявок нет",
    requestBody:
      "Хочет добавить вас в свою сеть знакомств. Благодаря этому вас смогут найти через общих знакомых, когда будут искать специалиста вроде вас.",
    accept: "Принять",
    decline: "Отклонить",
    searchPlaceholder: "Найти специалиста (напр. дизайнер)",
    searching: "Ищем…",
    emptyNetworkBanner: "Ваша сеть пока пуста. Пригласите первого знакомого — так о нём узнают через вас, и наоборот.",
    invite: "Пригласить",
    hintExpand: "Нажмите на человека на графе, затем — «Раскрыть контакты». Добавьте свои полезные контакты, чтобы о них узнали другие.",
    emptyState: "Пока у вас нет подтверждённых знакомств. Нажмите на кнопку «+» вверху, чтобы пригласить первого человека, или дождитесь, пока кто-то добавит вас.",
    infoPanelTitle: "Информация",
    pathTo: (name: string) => `Путь до ${name}`,
    backToGraph: "Назад к графу",
    searchingPath: "Ищем путь…",
    noConfirmedPath: "Нет подтверждённого пути",
    contactsCount: (n: string) => `Знакомых: ${n}`,
    contactsTitle: "Контакты",
    noContactShare: "Человек не разрешил делиться своими контактами",
    recommendationsTitle: "Отзывы знакомых, через которых вы вышли",
    selectPersonHint: "Выберите человека на графе",
    removeContact: "Удалить из круга",
    removeConfirmTitle: (name: string) => `Удалить ${name} из вашего круга?`,
    removeConfirmBody: "Связь пропадёт для вас обоих.",
    blockContact: "Заблокировать",
    blockConfirmTitle: (name: string) => `Заблокировать ${name}?`,
    blockConfirmBody: "Связь удалится, а человек больше не сможет отправить вам заявку.",
    confirmYesRemove: "Да, удалить",
    confirmYesBlock: "Да, заблокировать",
    confirmCancel: "Отмена",
    actionFailed: "Не удалось выполнить действие",
    modal: {
      title: "Добавить контакт",
      searchIntro: "Сначала поищем — может, человек уже зарегистрирован.",
      searchPlaceholder: "Имя или профессия",
      noResults: "Никого не нашли",
      sendRequest: "Отправить заявку",
      notInList: "Человека нет в списке — пригласить",
      inviteIntro: "Отправьте приглашение, чтобы добавить человека в свою сеть знакомств.",
      whatsappLabel: "WhatsApp",
      pickContact: "Выбрать из контактов",
      sendInvite: "Отправить приглашение",
      sending: "Отправляем…",
      backToSearch: "Назад к поиску",
      linkReady: "Ссылка готова — WhatsApp уже открылся:",
      copy: "Скопировать",
      copied: "Скопировано ✓",
      openWhatsappAgain: "Открыть WhatsApp ещё раз",
      done: "Готово",
      sentToPrefix: "Заявка на связь отправлена пользователю",
      sentToSuffix: "Как только он подтвердит — вы увидите его в графе.",
    },
    errors: {
      alreadySent: "Заявка этому человеку уже отправлена ранее",
      inviteFailed: "Не удалось создать приглашение",
    },
    whatsappInviteText: (link: string) =>
      `Привет! Присоединяйся к моей сети знакомых — так тебя смогут найти через общих знакомых, когда будут искать специалиста вроде тебя: ${link}`,
  },
  invite: {
    checking: "Проверяем приглашение…",
    accepting: "Подключаем вас к сети знакомств…",
    doneTitle: "Готово!",
    doneBody: "Заявка на связь отправлена. Переходим в граф…",
    invalidLink: "Ссылка недействительна или уже использована",
  },
  legal: {
    back: "← Назад",
    title: "Согласие на обработку персональных данных",
    lastUpdated: (date: string) => `Последнее обновление: ${date}`,
    section1: {
      title: "1. Какие данные мы собираем",
      items: [
        "Имя и email — при регистрации",
        "Специализация/род деятельности — если вы её укажете",
        "Телефон, WhatsApp, Instagram — если вы их укажете в профиле",
        "Информация о ваших связях (кто с кем знаком) и оставленные вами отзывы о знакомых",
        "При входе через Google — имя, email и фото профиля, предоставленные Google",
      ],
    },
    section2: {
      title: "2. Зачем это нужно",
      body: "Данные используются для работы сервиса: чтобы вас могли найти через общих знакомых, показать ваш профиль другим пользователям сети и связать вас с приглашённым контактом. Мы не используем ваши данные для рекламы третьих лиц и не продаём их.",
    },
    section3: {
      title: "3. Кому видны данные",
      items: [
        "Имя, специализация и сам факт связи — видны другим авторизованным пользователям сети",
        "Телефон, WhatsApp и Instagram — видны другим пользователям только если вы включили переключатель «Показывать мои контакты знакомым» в профиле",
        "Email нигде, кроме вашего аккаунта, не отображается",
      ],
    },
    section4: {
      title: "4. Где хранятся данные",
      body: "Данные хранятся в облачной базе данных с разграничением доступа — каждый пользователь может редактировать только свой профиль и свои связи.",
    },
    section5: {
      title: "5. Ваши права",
      before: "Вы можете в любой момент изменить или удалить данные своего профиля на странице",
      linkText: "«Профиль»",
      after: ", отозвать согласие на показ контактов (выключив переключатель) или запросить полное удаление аккаунта, написав нам.",
    },
    section6: {
      title: "6. Согласие",
      body: "Регистрируясь, вы подтверждаете, что ознакомлены с этим документом и даёте согласие на обработку указанных выше персональных данных в описанных целях.",
    },
  },
};

export default ru;
export type Dictionary = typeof ru;
