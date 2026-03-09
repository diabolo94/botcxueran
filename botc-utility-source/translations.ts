
const en = {
    sidebar: {
      home: 'Home',
      scripts: 'Scripts',
      characters: 'Characters',
      rules: 'Rules',
      roleAssignment: 'Role Assignment',
      gameRecords: 'Game Records',
      gameSimulation: 'Simulation',
      abilityTypes: 'Ability Types',
      jsonImport: 'JSON Import',
      aiScriptAnalysis: 'AI Analysis',
      characterLearning: 'Char Learning',
      sync: 'Sync',
      onlineGame: 'Online Game'
    },
    home: {
      title: 'Welcome to BOTC Master',
      subtitle: 'Your ultimate Blood on the Clocktower utility.',
      features: {
        scripts: 'Manage and create custom scripts.',
        characters: 'Browse and edit character database.',
        roleAssignment: 'Assign roles and manage game state.',
        gameRecords: 'Track game history and statistics.',
        rules: 'Access and organize game rules.',
        abilityTypes: 'Customize ability types and markers.',
        gameSimulation: 'Simulate game scenarios.',
        characterLearning: 'Learn characters with AI.',
        aiScriptAnalysis: 'Analyze script balance with AI.',
        onlineGame: 'Play online with friends.',
        jsonImport: 'Import scripts from JSON.',
        sync: 'Backup and sync your data.'
      }
    },
    onlineGame: {
      title: 'Online Blood on the Clocktower',
      hostMode: 'Host Game',
      joinMode: 'Join Game',
      createRoom: 'Create Room',
      enterName: 'Enter Your Name',
      enterRoomId: 'Enter Room ID',
      join: 'Join',
      lobby: 'Lobby',
      waitingForHost: 'Waiting for Storyteller...',
      playersConnected: 'Players Connected',
      gameStarted: 'Game Started!',
      yourRole: 'Your Role',
      tapToReveal: 'Tap to Reveal',
      townSquare: 'Town Square',
      grimoire: 'Grimoire (Host)',
      broadcast: 'Broadcast State',
      copyId: 'Copy Room ID',
      setSeat: 'Assign Seat',
      kick: 'Kick',
      kill: 'Kill',
      revive: 'Revive',
      sendMessage: 'Send Msg',
      closeRoom: 'Close Room',
      gameStatus: 'Game Status',
      nightInfo: 'Night Info',
      messagePlaceholder: 'Message to player...'
    },
    header: {
      addScript: 'Add Script',
      addCharacter: 'Add Character',
      searchPlaceholder: 'Search...',
      delete: 'Delete',
      deleteSelected: 'Delete Selected ({{count}})'
    },
    form: {
      name: 'Name',
      cancel: 'Cancel',
      saveChanges: 'Save Changes',
      description: 'Description',
      characterType: 'Character Type',
      ability: 'Ability',
      abilityType: 'Ability Type',
      imagePreview: 'Image Preview',
      uploadPrompt: 'Upload Image',
      processing: 'Processing...',
      inputTypeUrl: 'URL',
      inputTypeUpload: 'Upload',
      bio: 'Character Background',
      story: 'Story',
      example: 'Example',
      howItWorks: 'How it Works',
      tips: 'Tips',
      reminders: 'Reminders',
      addReminder: 'Add Reminder',
      reminderName: 'Token Name',
      reminderContent: 'Token Content',
      associatedScripts: 'Associated Scripts',
      close: 'Close',
      saveCharacter: 'Save Character',
      saveScript: 'Save Script',
      noAssociatedScripts: 'No associated scripts found.',
      firstNight: 'First Night',
      otherNights: 'Other Nights',
      nightOrder: 'Night Order',
      noActionsYet: 'No actions defined.',
      customActionText: 'Custom Action Text',
      selectCharacterOrAction: 'Select Character or Predefined Action',
      characters: 'Characters',
      predefinedActions: 'Predefined Actions',
      coverImageUrl: 'Cover Image URL',
      characterListImageUrl: 'Character List Image URL',
      jsonUrl: 'JSON URL',
      handbookUrl: 'Handbook URL',
      difficulty: 'Difficulty',
      scriptTypes: 'Script Types',
      availableCharacters: 'Available Characters',
      searchCharacters: 'Search characters...',
      addSelected: 'Add Selected',
      removeSelected: 'Remove Selected',
      selectedCharacters: 'Selected Characters',
      searchSelectedCharacters: 'Search selected...',
      links: 'Links',
      noCharacterListImage: 'No character list image provided.',
      noCoverImage: 'No cover image.',
      noAssociatedTypes: 'No types associated.',
      availableScripts: 'All Scripts',
      allTypes: 'All Types',
      allCharacterTypes: 'All Character Types',
      allGameRecords: 'All Game Records',
      backToList: 'Back to Scripts List',
      viewRule: 'View Rule',
      zoom: 'Zoom',
      offsetX: 'Offset X',
      offsetY: 'Offset Y',
      adjustIconFit: 'Adjust Icon Fit'
    },
    characterType: {
      Townsfolk: 'Townsfolk',
      Outsider: 'Outsider',
      Minion: 'Minion',
      Demon: 'Demon',
      Traveler: 'Traveler',
      Fabled: 'Fabled',
      Loric: 'Loric'
    },
    sortOptions: {
      nameAsc: 'Name (A-Z)',
      nameDesc: 'Name (Z-A)',
      difficultyAsc: 'Difficulty (Low-High)',
      difficultyDesc: 'Difficulty (High-Low)',
      typeAsc: 'Type (Standard)',
      typeDesc: 'Type (Reverse)'
    },
    confirmDelete: {
      item: 'Are you sure you want to delete "{{name}}"? This cannot be undone.'
    },
    bulk: {
      deleteConfirm: 'Are you sure you want to delete {{count}} items?',
      selectAll: 'Select All',
      unselectAll: 'Unselect All',
      invert: 'Invert Selection'
    },
    roleAssignment: {
      player: 'Player',
      assignRoles: 'Assign Roles',
      thinks_they_are: 'Thinks they are ',
      selectScript: 'Select Script',
      players: 'Players',
      selectRandomly: 'Randomize',
      startReveal: 'Reveal',
      start: 'Start Game',
      holdToReveal: 'Hold to Reveal',
      revealNext: 'Next',
      you_are: 'You are',
      bluffRolesTitle: 'Demon Bluffs',
      editBluffRoles: 'Edit Bluffs',
      helperNightOrder: 'Night Helper',
      assignments: 'Assignments',
      nominates: 'Nominates',
      nominator: 'Nominator',
      nominee: 'Nominee',
      saveLog: 'Save Log',
      actionPlaceholder: 'Action details...',
      generalNote: 'General Note',
      FirstNight: 'First Night',
      Day: 'Day {{day}}',
      Night: 'Night {{day}}',
      endFirstNight: 'End First Night',
      endDay: 'End Day {{day}}',
      endNight: 'End Night {{day}}',
      recordNomination: 'Record Nomination',
      filters: {
        all: 'All',
        votes: 'Votes',
        deaths: 'Deaths',
        notes: 'Notes'
      },
      saveSetup: 'Save Setup',
      loadSetup: 'Load Setup',
      setupName: 'Setup Name',
      saveSetupTitle: 'Save Current Setup',
      loadSetupTitle: 'Load Saved Setup',
      noSavedSetups: 'No saved setups found.',
      confirmLoad: 'Load this setup? Current assignments will be overwritten.',
      deleteSetupConfirm: 'Delete this setup?',
      editPlayer: 'Edit Player #{{player}}',
      role: 'Role',
      alignment: 'Alignment',
      good: 'Good',
      evil: 'Evil',
      pretendRole: 'Pretend Role (Drunk/Lunatic)',
      none: 'None',
      stats: {
        currentSetup: "Current:",
        townsfolkShort: "T",
        outsiderShort: "O",
        minionShort: "M",
        demonShort: "D"
      },
      cognitive: {
        drunk_thinks: "Drunk (thinks {{role}})",
        lunatic_thinks: "Lunatic (sees {{role}})",
        marionette_thinks: "Marionette (thinks {{role}})",
        generic_thinks: "Pseudo: {{role}}"
      }
    },
    gameRecords: {
      title: 'Game Records',
      unnamedSession: 'Unnamed Session',
      deleteConfirm: 'Are you sure you want to delete this record?',
      noRecords: 'No game records found.',
      rewindPhase: 'Rewind Phase'
    },
    playerStatus: {
      alive: 'Alive',
      dead: 'Dead'
    },
    statusMarkers: {
      redHerring: { text: 'Red Herring' },
      grandchild: { text: 'Grandchild' },
      poisoned: { text: 'Poisoned' },
      drunk: { text: 'Drunk' },
      maddened: { text: 'Maddened' },
      noAbility: { text: 'No Ability' },
      ghostVote: { text: 'Ghost Vote' }
    },
    keywords: {
      select: 'Select',
      storyteller: 'Storyteller',
      inform_3_not_in_play: 'Inform 3 not in play',
      inform_minions: 'Inform Minions',
      inform_player_role: 'Inform Player Role',
      inform_role_in_play: 'Inform Role in Play',
      pretend_role_in_play: 'Pretend Role in Play',
      select_one_player: 'Select One Player',
      townsfolk: {
        died: 'died',
        revived: 'revived',
        is_poisoned: 'is poisoned',
        is_healthy: 'is healthy',
        is_drunk: 'is drunk',
        is_sober: 'is sober',
        is_maddened: 'is maddened',
        is_normal: 'is normal',
        lost_ability: 'lost ability',
        regained_ability: 'regained ability'
      }
    },
    actionTypes: {
        whoActs: 'Who Acts?',
        inputModes: {
            custom: 'Custom',
            state: 'State',
            storyteller: 'Storyteller'
        }
    },
    showInfo: {
      title: 'Show Info',
      placeholder: 'Enter custom text...',
      reset: 'Reset',
      tabs: {
        selection: 'Selection',
        history: 'History'
      },
      sections: {
        phrase: 'Phrase',
        characters: 'Characters',
        seats: 'Seats',
        alignment: 'Alignment'
      },
      alignment: {
        good: 'Good',
        evil: 'Evil'
      },
      phrases: {
        you_are_role: 'You are:',
        you_learnt_role: 'You learnt his role is:',
        do_you_want_ability: 'Do you want to use your ability?',
        be_mad_about: 'You need to be mad about being:',
        your_alignment: 'Your alignment is:',
        cannot_select_rechoose: 'You cannot select this, please choose again.',
        select_x_players: 'Select {{count}} player(s)',
        select_x_characters: 'Select {{count}} character(s)',
        select_x_players_x_characters: 'Select {{count}} player(s) & {{count}} character(s)',
        he_is_demon: 'He is the Demon',
        your_minions: 'Your Minions are',
        you_are_demon: 'You are the Demon',
        custom: 'Custom input...'
      },
      history: {
        namePrompt: 'Name for this favorite:',
        saveFavorite: 'Save to Favorites',
        favorites: 'Favorites'
      }
    },
    scriptModal: {
      addTitle: 'Add New Script',
      editTitle: 'Edit Script'
    },
    characterModal: {
      addTitle: 'Add New Character',
      editTitle: 'Edit Character'
    },
    abilityType: {
      selectOrType: 'Select or type...',
      addCustom: 'Add Custom Type',
      createTitle: 'Create "{{name}}"',
      newDescriptionPlaceholder: 'Description for new type...',
      noDescription: 'No description.',
      desc: {
        Standard: 'Standard ability, works as written.',
        Triggered: 'Triggered by an event or action.',
        'Once per game': 'Can only be used once per game.',
        Passive: 'Always active, does not require action.'
      }
    },
    abilityTypesManager: {
      title: 'Ability Types',
      add: 'Add Type',
      isStandard: 'Standard',
      deleteConfirm: 'Delete type "{{name}}"?',
      bulkDeleteConfirm: 'Delete {{count}} types?',
      edit: 'Edit Type',
      name: 'Name',
      description: 'Description',
      visuals: 'Visual Style',
      phase: 'Active Phase',
      usage: 'Usage',
      usedBy: 'Used by {{count}} character(s)',
      cannotDelete: 'Cannot delete: Used by {{count}} characters.',
      colors: {
        blue: 'Blue', red: 'Red', gold: 'Gold', green: 'Green', purple: 'Purple', gray: 'Gray', slate: 'Slate'
      },
      phases: {
        Setup: 'Setup',
        FirstNight: 'First Night',
        EveryNight: 'Every Night',
        Day: 'Day',
        Passive: 'Passive'
      }
    },
    rules: {
      newFolder: 'New Folder',
      newDocument: 'New Document',
      renameTitle: 'Rename',
      addDocument: 'Add Doc',
      addFolder: 'Add Folder',
      confirmDelete: 'Delete "{{name}}"?',
      deleteSelectedConfirm: 'Delete {{count}} items?',
      searchPlaceholder: 'Search rules...',
      exportJSON: 'Export JSON',
      exportZIP: 'Export ZIP',
      importRules: 'Import Rules',
      noDocumentSelected: 'Select a document to view.'
    },
    editor: {
      documentTitle: 'Document Title',
      unsaved: 'Unsaved'
    },
    scriptTypeManager: {
      title: 'Manage Script Types',
      existing: 'Existing Types',
      addNew: 'Add New Type',
      newPlaceholder: 'Type name...'
    },
    jsonImport: {
      title: 'JSON Import',
      description: 'Paste JSON content to import scripts and characters. Supports standard format.',
      placeholder: 'Paste JSON here...',
      importing: 'Importing...',
      analyzeAndImport: 'Analyze & Import',
      fileUpload: 'Upload JSON File',
      success: 'Successfully imported script "{{scriptName}}" with {{count}} characters.',
      error: 'Import failed. Check format.'
    },
    aiAnalysis: {
      title: 'AI Analysis',
      analyze: 'Analyze Game',
      analyzing: 'Analyzing...',
      resultPreview: 'Result Preview',
      saveToRules: 'Save to Rules',
      saved: 'Saved!',
      errorFailed: 'Analysis Failed',
      prompt: 'Analyze this game record...'
    },
    aiConfig: {
      title: 'AI Config Assistant',
      description: 'AI suggests bluffs based on current board state.',
      startAnalysis: 'Start Analysis',
      retry: 'Retry',
      balanceReport: 'Balance Report',
      suggestedBluffs: 'Suggested Bluffs',
      applyBluffs: 'Apply Bluffs'
    },
    aiSeating: {
      title: 'AI Seating',
      description: 'AI optimizes seating arrangement.',
      analysisReport: 'Seating Logic',
      applyOrder: 'Apply Order'
    },
    aiScriptAnalysis: {
      title: 'AI Script Analysis',
      description: 'Analyze script balance and character interactions.',
      selectScript: 'Select Script',
      startAnalysis: 'Start Analysis',
      analyzing: 'Analyzing...',
      analyzingDesc: 'AI is reading the script...',
      previewTitle: 'Analysis Report',
      saved: 'Saved to Rules',
      promptSystem: 'You are a BOTC expert.',
      promptInstruction: 'Analyze the script.'
    },
    learning: {
      title: 'Character Learning',
      description: 'Master characters with AI tutors.',
      selectChar: 'Select a character to start.',
      progress: 'Mastery Progress',
      stats: '{{count}} Characters Mastered',
      searchPrompt: 'Search characters...',
      mastered: 'Mastered',
      markMastered: 'Mark as Mastered',
      speedNotice: 'Using accelerated AI model for faster response.',
      infographic: 'Infographic',
      interactions: 'Interactions',
      quiz: 'Quiz',
      regenerate: 'Regenerate',
      moduleEmpty: 'No content yet.',
      generateInfographic: 'Generate Infographic',
      generateInteractions: 'Analyze Interactions',
      generateQuiz: 'Start Quiz',
      quizCorrect: 'Correct!',
      quizWrong: 'Incorrect'
    },
    sync: {
      title: 'Backup & Sync',
      firebaseTitle: 'Firebase Sync',
      firebaseMissingConfig: 'Missing Firebase Config',
      pasteConfigLabel: 'Paste Firebase Config JSON',
      yourSyncKey: 'Your Sync Key',
      pushToCloud: 'Push to Cloud',
      pullFromCloud: 'Pull from Cloud',
      manualBackupTitle: 'Manual Backup'
    },
    simulation: {
      title: 'Game Simulation'
    },
    nightActions: {
      firstNight: {
        checkEyes: 'Minions info, Demon info',
        minionsInfo: 'Minions know each other',
        demonInfo: 'Demon knows Minions',
        dawn: 'Dawn breaks'
      },
      otherNights: {
        checkEyes: 'Check eyes closed',
        dawn: 'Dawn breaks'
      }
    },
    alert: {
      nameRequired: 'Name is required.',
      ruleNotFound: 'Ability type not found, will create custom.',
      importSuccess: 'Import successful!',
      importFailed: 'Import failed.'
    }
};

export type TranslationSchema = typeof en;

export const translations: Record<'en' | 'zh-TW' | 'zh-CN' | 'ja', TranslationSchema> = {
  'en': en,
  'zh-TW': {
    sidebar: {
      home: '首頁',
      scripts: '劇本管理',
      characters: '角色圖鑑',
      rules: '規則書',
      roleAssignment: '魔典設置',
      gameRecords: '對局記錄',
      gameSimulation: '模擬沙盤',
      onlineGame: '線上連線',
      abilityTypes: '能力類型',
      jsonImport: 'JSON 匯入',
      aiScriptAnalysis: 'AI 劇本分析',
      characterLearning: '角色導師',
      sync: '資料同步'
    },
    home: {
      title: '歡迎使用染鐘樓謎團萬能工具',
      subtitle: '您的終極染鐘樓謎團輔助工具。',
      features: {
        scripts: '管理和創建自定義劇本。',
        characters: '瀏覽和編輯角色資料庫。',
        roleAssignment: '分配角色並管理遊戲狀態。',
        gameRecords: '追蹤遊戲歷史和統計數據。',
        rules: '存取和組織遊戲規則。',
        abilityTypes: '自定義能力類型和標記。',
        gameSimulation: '模擬遊戲場景。',
        characterLearning: '透過 AI 學習角色。',
        aiScriptAnalysis: '使用 AI 分析劇本平衡性。',
        onlineGame: '與朋友線上遊玩。',
        jsonImport: '從 JSON 匯入劇本。',
        sync: '備份和同步您的資料。'
      }
    },
    onlineGame: {
      title: '線上血染鐘樓',
      hostMode: '建立房間',
      joinMode: '加入房間',
      createRoom: '建立房間',
      enterName: '輸入暱稱',
      enterRoomId: '輸入房間 ID',
      join: '加入',
      lobby: '大廳',
      waitingForHost: '等待說書人...',
      playersConnected: '已連線玩家',
      gameStarted: '遊戲開始！',
      yourRole: '你的角色',
      tapToReveal: '點擊翻開',
      townSquare: '城鎮廣場',
      grimoire: '魔典 (說書人)',
      broadcast: '廣播狀態',
      copyId: '複製 ID',
      setSeat: '分配座位',
      kick: '踢出',
      kill: '殺死',
      revive: '復活',
      sendMessage: '傳送',
      closeRoom: '關閉房間',
      gameStatus: '遊戲狀態',
      nightInfo: '夜晚資訊',
      messagePlaceholder: '輸入訊息給玩家...'
    },
    header: {
      addScript: '新增劇本',
      addCharacter: '新增角色',
      searchPlaceholder: '搜尋...',
      delete: '刪除',
      deleteSelected: '刪除選取項目 ({{count}})'
    },
    form: {
      name: '名稱',
      cancel: '取消',
      saveChanges: '儲存變更',
      description: '描述',
      characterType: '角色類型',
      ability: '能力',
      abilityType: '能力類型',
      imagePreview: '圖片預覽',
      uploadPrompt: '上傳圖片',
      processing: '處理中...',
      inputTypeUrl: '網址',
      inputTypeUpload: '上傳',
      bio: '角色背景',
      story: '故事',
      example: '範例',
      howItWorks: '運作方式',
      tips: '技巧',
      reminders: '提示標記',
      addReminder: '新增提示',
      reminderName: '標記名稱',
      reminderContent: '標記內容',
      associatedScripts: '關聯劇本',
      close: '關閉',
      saveCharacter: '儲存角色',
      saveScript: '儲存劇本',
      noAssociatedScripts: '沒有關聯的劇本。',
      firstNight: '首夜',
      otherNights: '其他夜晚',
      nightOrder: '夜晚順序',
      noActionsYet: '尚未定義行動。',
      customActionText: '自訂行動文字',
      selectCharacterOrAction: '選擇角色或預定義行動',
      characters: '角色',
      predefinedActions: '預定義行動',
      coverImageUrl: '封面圖片網址',
      characterListImageUrl: '角色列表圖片網址',
      jsonUrl: 'JSON 網址',
      handbookUrl: '手冊網址',
      difficulty: '難度',
      scriptTypes: '劇本類型',
      availableCharacters: '可用角色',
      searchCharacters: '搜尋角色...',
      addSelected: '新增選取',
      removeSelected: '移除選取',
      selectedCharacters: '已選角色',
      searchSelectedCharacters: '搜尋已選...',
      links: '連結',
      noCharacterListImage: '未提供角色列表圖片。',
      noCoverImage: '無封面圖片。',
      noAssociatedTypes: '未關聯類型。',
      availableScripts: '所有劇本',
      allTypes: '所有類型',
      allCharacterTypes: '所有角色類型',
      allGameRecords: '所有對局記錄',
      backToList: '返回列表',
      viewRule: '查看規則',
      zoom: '縮放',
      offsetX: 'X 偏移',
      offsetY: 'Y 偏移',
      adjustIconFit: '調整圖示位置'
    },
    characterType: {
      Townsfolk: '鎮民',
      Outsider: '外來者',
      Minion: '爪牙',
      Demon: '惡魔',
      Traveler: '旅行者',
      Fabled: '傳奇角色',
      Loric: '奇遇角色'
    },
    sortOptions: {
      nameAsc: '名稱 (A-Z)',
      nameDesc: '名稱 (Z-A)',
      difficultyAsc: '難度 (低-高)',
      difficultyDesc: '難度 (高-低)',
      typeAsc: '類型 (標準)',
      typeDesc: '類型 (反向)'
    },
    confirmDelete: {
      item: '確定要刪除「{{name}}」嗎？此操作無法復原。'
    },
    bulk: {
      deleteConfirm: '確定要刪除 {{count}} 個項目嗎？',
      selectAll: '全選',
      unselectAll: '取消全選',
      invert: '反向選擇'
    },
    roleAssignment: {
      player: '玩家',
      assignRoles: '分配角色',
      thinks_they_are: '以為自己是 ',
      selectScript: '選擇劇本',
      players: '玩家人數',
      selectRandomly: '隨機分配',
      startReveal: '開始翻牌',
      start: '開始遊戲',
      holdToReveal: '長按翻開',
      revealNext: '下一個',
      you_are: '你是',
      bluffRolesTitle: '惡魔偽裝',
      editBluffRoles: '編輯偽裝',
      helperNightOrder: '夜晚助手',
      assignments: '分配結果',
      nominates: '提名',
      nominator: '提名者',
      nominee: '被提名者',
      saveLog: '記錄日誌',
      actionPlaceholder: '行動細節...',
      generalNote: '一般筆記',
      FirstNight: '首夜',
      Day: '第 {{day}} 天',
      Night: '第 {{day}} 夜',
      endFirstNight: '結束首夜',
      endDay: '結束白天 {{day}}',
      endNight: '結束夜晚 {{day}}',
      recordNomination: '記錄提名',
      filters: {
        all: '全部',
        votes: '投票',
        deaths: '死亡',
        notes: '筆記'
      },
      saveSetup: '儲存配置',
      loadSetup: '載入配置',
      setupName: '配置名稱',
      saveSetupTitle: '儲存當前配置',
      loadSetupTitle: '載入已存配置',
      noSavedSetups: '找不到已儲存的配置。',
      confirmLoad: '載入此配置？目前的分配將被覆蓋。',
      deleteSetupConfirm: '刪除此配置？',
      editPlayer: '編輯玩家 #{{player}}',
      role: '角色',
      alignment: '陣營',
      good: '善良',
      evil: '邪惡',
      pretendRole: '偽裝角色 (酒鬼/瘋子)',
      none: '無',
      stats: {
        currentSetup: "當前配置:",
        townsfolkShort: "鎮",
        outsiderShort: "外",
        minionShort: "爪",
        demonShort: "惡"
      },
      cognitive: {
        drunk_thinks: "酒鬼 (以為是 {{role}})",
        lunatic_thinks: "瘋子 (看到 {{role}})",
        marionette_thinks: "傀儡 (以為是 {{role}})",
        generic_thinks: "偽裝: {{role}}"
      }
    },
    gameRecords: {
      title: '對局記錄',
      unnamedSession: '未命名對局',
      deleteConfirm: '確定要刪除此記錄嗎？',
      noRecords: '找不到對局記錄。',
      rewindPhase: '回溯階段'
    },
    playerStatus: {
      alive: '存活',
      dead: '死亡'
    },
    statusMarkers: {
      redHerring: { text: '紅鯡魚' },
      grandchild: { text: '孫子' },
      poisoned: { text: '中毒' },
      drunk: { text: '酒醉' },
      maddened: { text: '瘋狂' },
      noAbility: { text: '無能力' },
      ghostVote: { text: '死人票' }
    },
    keywords: {
      select: '選擇',
      storyteller: '說書人',
      inform_3_not_in_play: '告知 3 個不在場角色',
      inform_minions: '告知爪牙',
      inform_player_role: '告知玩家角色',
      inform_role_in_play: '告知在場角色',
      pretend_role_in_play: '偽裝在場角色',
      select_one_player: '選擇一名玩家',
      townsfolk: {
        died: '死亡',
        revived: '復活',
        is_poisoned: '中毒',
        is_healthy: '健康',
        is_drunk: '酒醉',
        is_sober: '清醒',
        is_maddened: '發瘋',
        is_normal: '恢復正常',
        lost_ability: '失去能力',
        regained_ability: '重獲能力'
      }
    },
    actionTypes: {
        whoActs: '誰行動？',
        inputModes: {
            custom: '自定義',
            state: '狀態變更',
            storyteller: '說書人'
        }
    },
    showInfo: {
      title: '展示資訊',
      placeholder: '輸入自定義文字...',
      reset: '重置',
      tabs: {
        selection: '選擇',
        history: '歷史'
      },
      sections: {
        phrase: '短語',
        characters: '角色',
        seats: '座位',
        alignment: '陣營'
      },
      alignment: {
        good: '善良',
        evil: '邪惡'
      },
      phrases: {
        you_are_role: '你是：',
        you_learnt_role: '你得知他的角色是：',
        do_you_want_ability: '你想使用能力嗎？',
        be_mad_about: '你需要表現得像：',
        your_alignment: '你的陣營是：',
        cannot_select_rechoose: '你不能選擇這個，請重選。',
        select_x_players: '選擇 {{count}} 名玩家',
        select_x_characters: '選擇 {{count}} 個角色',
        select_x_players_x_characters: '選擇 {{count}} 名玩家 & {{count}} 個角色',
        he_is_demon: '他是惡魔',
        your_minions: '你的爪牙是',
        you_are_demon: '你是惡魔',
        custom: '自定義輸入...'
      },
      history: {
        namePrompt: '為此收藏命名:',
        saveFavorite: '儲存至收藏',
        favorites: '收藏夾'
      }
    },
    scriptModal: {
      addTitle: '新增劇本',
      editTitle: '編輯劇本'
    },
    characterModal: {
      addTitle: '新增角色',
      editTitle: '編輯角色'
    },
    abilityType: {
      selectOrType: '選擇或輸入...',
      addCustom: '新增自訂類型',
      createTitle: '建立 "{{name}}"',
      newDescriptionPlaceholder: '新類型的描述...',
      noDescription: '無描述。',
      desc: {
        Standard: '標準能力，按文字描述運作。',
        Triggered: '由事件或行動觸發。',
        'Once per game': '整局遊戲只能使用一次。',
        Passive: '始終有效，無需行動。'
      }
    },
    abilityTypesManager: {
      title: '能力類型管理',
      add: '新增類型',
      isStandard: '標準',
      deleteConfirm: '刪除類型「{{name}}」？',
      bulkDeleteConfirm: '刪除 {{count}} 個類型？',
      edit: '編輯類型',
      name: '名稱',
      description: '描述',
      visuals: '視覺樣式',
      phase: '生效階段',
      usage: '引用統計',
      usedBy: '被 {{count}} 個角色使用',
      cannotDelete: '無法刪除：正被 {{count}} 個角色使用。',
      colors: {
        blue: '藍色', red: '紅色', gold: '金色', green: '綠色', purple: '紫色', gray: '灰色', slate: '石色'
      },
      phases: {
        Setup: '遊戲設置 (Setup)',
        FirstNight: '首夜 (First Night)',
        EveryNight: '每晚 (Every Night)',
        Day: '白天 (Day)',
        Passive: '被動 (Passive)'
      }
    },
    rules: {
      newFolder: '新資料夾',
      newDocument: '新文件',
      renameTitle: '重新命名',
      addDocument: '新增文件',
      addFolder: '新增資料夾',
      confirmDelete: '刪除「{{name}}」？',
      deleteSelectedConfirm: '刪除 {{count}} 個項目？',
      searchPlaceholder: '搜尋規則...',
      exportJSON: '匯出 JSON',
      exportZIP: '匯出 ZIP',
      importRules: '匯入規則',
      noDocumentSelected: '選擇一份文件以檢視。'
    },
    editor: {
      documentTitle: '文件標題',
      unsaved: '未儲存'
    },
    scriptTypeManager: {
      title: '管理劇本類型',
      existing: '現有類型',
      addNew: '新增類型',
      newPlaceholder: '類型名稱...'
    },
    jsonImport: {
      title: 'JSON 匯入',
      description: '貼上 JSON 內容以匯入劇本和角色。支援標準格式。',
      placeholder: '在此貼上 JSON...',
      importing: '匯入中...',
      analyzeAndImport: '分析並匯入',
      fileUpload: '上傳 JSON 檔案',
      success: '成功匯入劇本「{{scriptName}}」與 {{count}} 個角色。',
      error: '匯入失敗。請檢查格式。'
    },
    aiAnalysis: {
      title: 'AI 分析',
      analyze: '分析局勢',
      analyzing: '分析中...',
      resultPreview: '結果預覽',
      saveToRules: '存入規則書',
      saved: '已儲存!',
      errorFailed: '分析失敗',
      prompt: '分析這場對局記錄...'
    },
    aiConfig: {
      title: 'AI 配置助手',
      description: 'AI 根據當前局面建議惡魔偽裝。',
      startAnalysis: '開始分析',
      retry: '重試',
      balanceReport: '平衡性報告',
      suggestedBluffs: '建議偽裝',
      applyBluffs: '套用偽裝'
    },
    aiSeating: {
      title: 'AI 座位優化',
      description: 'AI 優化座位安排。',
      analysisReport: '排座邏輯',
      applyOrder: '套用順序'
    },
    aiScriptAnalysis: {
      title: 'AI 劇本分析',
      description: '分析劇本平衡性與角色互動。',
      selectScript: '選擇劇本',
      startAnalysis: '開始分析',
      analyzing: '分析中...',
      analyzingDesc: 'AI 正在閱讀劇本...',
      previewTitle: '分析報告',
      saved: '已存入規則',
      promptSystem: '你是染鐘樓謎團專家。',
      promptInstruction: '分析此劇本。'
    },
    learning: {
      title: '角色導師',
      description: '透過 AI 導師精通角色。',
      selectChar: '選擇一個角色開始。',
      progress: '精通進度',
      stats: '已精通 {{count}} 個角色',
      searchPrompt: '搜尋角色...',
      mastered: '已精通',
      markMastered: '標記為精通',
      speedNotice: '使用加速 AI 模型以獲得更快回應。',
      infographic: '全息圖',
      interactions: '互動推演',
      quiz: '隨堂測驗',
      regenerate: '重新生成',
      moduleEmpty: '尚無內容。',
      generateInfographic: '生成全息圖',
      generateInteractions: '分析互動',
      generateQuiz: '開始測驗',
      quizCorrect: '正確!',
      quizWrong: '錯誤'
    },
    sync: {
      title: '備份與同步',
      firebaseTitle: 'Firebase 同步',
      firebaseMissingConfig: '缺少 Firebase 配置',
      pasteConfigLabel: '貼上 Firebase 配置 JSON',
      yourSyncKey: '你的同步金鑰',
      pushToCloud: '推送到雲端',
      pullFromCloud: '從雲端拉取',
      manualBackupTitle: '手動備份'
    },
    simulation: {
      title: '對局模擬'
    },
    nightActions: {
      firstNight: {
        checkEyes: '確認閉眼',
        minionsInfo: '爪牙互認',
        demonInfo: '惡魔得知爪牙',
        dawn: '天亮'
      },
      otherNights: {
        checkEyes: '確認閉眼',
        dawn: '天亮'
      }
    },
    alert: {
      nameRequired: '必須輸入名稱。',
      ruleNotFound: '找不到能力類型，將建立自定義類型。',
      importSuccess: '匯入成功！',
      importFailed: '匯入失敗。'
    }
  },
  'zh-CN': en, // Placeholder for simplicity
  'ja': en // Placeholder
};
