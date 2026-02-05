import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  StatusBar,
  ScrollView,
  Image,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const PURPLE = '#7C3AED';
const DARK_BG = '#0F172A';
const LIGHT_BG = '#FFFFFF';
const LIGHT_TEXT = '#0F172A';
const DARK_TEXT = '#F9FAFB';

const AnimatedCard = ({ children, style }) => {
  const scale = useRef(new Animated.Value(0.98)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale]);

  return (
    <Animated.View style={[{ transform: [{ scale }], opacity }, style]}>
      {children}
    </Animated.View>
  );
};

const ParticleBackground = ({ isDark }) => {
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => ({
        id: `p-${index}`,
        size: 6 + (index % 5) * 3,
        left: `${(index * 13) % 90}%`,
        top: `${(index * 17) % 90}%`,
        opacity: 0.15 + (index % 4) * 0.08,
      })),
    []
  );

  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: 'transparent' },
      ]}
    >
      {particles.map((particle) => (
        <View
          key={particle.id}
          style={{
            position: 'absolute',
            width: particle.size,
            height: particle.size,
            borderRadius: particle.size / 2,
            backgroundColor: isDark ? '#A5B4FC' : '#7C3AED',
            left: particle.left,
            top: particle.top,
            opacity: particle.opacity,
          }}
        />
      ))}
    </View>
  );
};

const GradientButton = ({
  label,
  onPress,
  colors = ['#7C3AED', '#8B5CF6'],
  style,
  textStyle,
}) => (
  <TouchableOpacity onPress={onPress} style={style} activeOpacity={0.85}>
    <View style={[styles.gradientButton, { backgroundColor: colors[0] }]}>
      <Text style={[styles.gradientButtonText, textStyle]}>{label}</Text>
    </View>
  </TouchableOpacity>
);

export default function App() {
  const AUTH_STORAGE_KEY = 'habitforge_auth_state_v1';
  const [isDark, setIsDark] = useState(false);
  const LOGIN_CHANGE_COOLDOWN_DAYS = 14;

  // Simple navigation between screens
  const [screen, setScreen] = useState('home'); // 'home' | 'habits' | 'challenge' | 'profile' | 'help'

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState('register'); // 'register' | 'login'
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [loginInput, setLoginInput] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [registeredUser, setRegisteredUser] = useState(null);
  const [loginName, setLoginName] = useState('');
  const [loginDraft, setLoginDraft] = useState('');
  const [lastLoginChange, setLastLoginChange] = useState(null);
  const [loginError, setLoginError] = useState('');
  const [toast, setToast] = useState(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef(null);

  // Habit state
  const [habitTitle, setHabitTitle] = useState('');
  const [habitDescription, setHabitDescription] = useState('');
  const [habits, setHabits] = useState([]);

  // Challenge state
  const ENTRY_FEE = 500;
  const BASE_PRIZE = 1500;
  const MAX_PARTICIPANTS = 10;
  const WEEK_LENGTH_DAYS = 7;
  const DELETE_WINDOW_HOURS = 12;
  const [participants, setParticipants] = useState([]);
  const [nickname, setNickname] = useState('');
  const [myParticipantId, setMyParticipantId] = useState(null);
  const [groupError, setGroupError] = useState('');

  // Profile / stats state
  const avatarOptions = ['🔥', '🚀', '🏆', '🧠', '🦾', '🐉'];
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [avatarUri, setAvatarUri] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [doneDays, setDoneDays] = useState(0);
  const [failedDays, setFailedDays] = useState(0);
  const [inProgressDays, setInProgressDays] = useState(0);
  const [totalBets, setTotalBets] = useState(0);
  const [averageBet, setAverageBet] = useState(0);
  const [balance, setBalance] = useState(0);

  const persistAuthState = async (nextState) => {
    try {
      await AsyncStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify(nextState)
      );
    } catch (error) {
      console.error('Failed to persist auth state:', error);
    }
  };

  const buildAuthSnapshot = () => ({
    isAuthenticated,
    loginName,
    registeredUser,
    balance,
    avatarUri,
  });

  const clearAuthState = async () => {
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear auth state:', error);
    }
  };

  useEffect(() => {
    const restoreAuth = async () => {
      try {
        const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (!stored) return;
        const parsed = JSON.parse(stored);
        if (!parsed) return;
        if (parsed.registeredUser) {
          setRegisteredUser(parsed.registeredUser);
        }
        if (parsed.loginName) {
          setLoginName(parsed.loginName);
          setLoginDraft(parsed.loginName);
        }
        if (parsed.avatarUri) {
          setAvatarUri(parsed.avatarUri);
        }
        if (typeof parsed.balance === 'number') {
          setBalance(parsed.balance);
        }
        if (parsed.isAuthenticated) {
          setIsAuthenticated(true);
          setScreen('home');
        }
      } catch (error) {
        console.error('Failed to restore auth state:', error);
      }
    };

    restoreAuth();
  }, []);

  useEffect(() => {
    if (!toast) return;
    Animated.timing(toastAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();

    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => setToast(null));
    }, 2800);
  }, [toast, toastAnim]);

  useEffect(() => {
    if (!isAuthenticated) return;
    persistAuthState(buildAuthSnapshot());
  }, [isAuthenticated, loginName, registeredUser, balance, avatarUri]);

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  const exerciseOptions = [
    'Отжимания',
    'Планка',
    'Приседания',
    'Бёрпи',
    'Скакалка',
    'Подтягивания',
  ];
  const weeklyFrequencyOptions = [3, 4, 5, 6];
  const getWeekStartDate = (date = new Date()) => {
    const current = new Date(date);
    const day = current.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    current.setHours(0, 0, 0, 0);
    current.setDate(current.getDate() + diff);
    return current;
  };
  const pickWeeklyExercises = (options) => {
    const count = Math.floor(Math.random() * 3) + 1;
    const shuffled = [...options].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };
  const [challenges, setChallenges] = useState([]);
  const [challengeExercise, setChallengeExercise] = useState('');
  const [challengeRepsTime, setChallengeRepsTime] = useState('');
  const [challengeSets, setChallengeSets] = useState('');
  const [challengePerWeek, setChallengePerWeek] = useState('3');
  const [challengeBet, setChallengeBet] = useState('500');
  const [challengeFailMode, setChallengeFailMode] = useState('charity'); // 'charity' | 'pool'
  const [challengeTab, setChallengeTab] = useState('list'); // 'list' | 'new'
  const [challengeError, setChallengeError] = useState('');
  const [challengeFilter, setChallengeFilter] = useState('all');
  const [challengePage, setChallengePage] = useState(1);
  const [weeklyStartAt, setWeeklyStartAt] = useState(() => getWeekStartDate());
  const [weeklyExercises, setWeeklyExercises] = useState(() =>
    pickWeeklyExercises(exerciseOptions)
  );
  const [weeklyFrequency, setWeeklyFrequency] = useState(4);
  const [weeklyOutcome, setWeeklyOutcome] = useState(null); // 'success' | 'fail'

  const backgroundColor = isDark ? DARK_BG : LIGHT_BG;
  const textColor = isDark ? DARK_TEXT : LIGHT_TEXT;
  const cardColor = isDark ? '#020617' : '#F9FAFB';
  const secondaryText = isDark ? '#CBD5F5' : '#6B7280';

  const msInDay = 24 * 60 * 60 * 1000;
  const prizePool = BASE_PRIZE + participants.length * ENTRY_FEE;
  const weeklyEndAt = new Date(
    weeklyStartAt.getTime() + (WEEK_LENGTH_DAYS - 1) * msInDay
  );
  const weekElapsedDays = Math.floor(
    (Date.now() - weeklyStartAt.getTime()) / msInDay
  );
  const weekEnded = weekElapsedDays >= WEEK_LENGTH_DAYS;
  const canFinalizeWeek = weekEnded;
  const winnersCount = participants.filter((p) => p.status === 'success').length;
  const payoutPerWinner =
    winnersCount > 0 ? Math.floor(prizePool / winnersCount) : 0;
  const isJoined = Boolean(myParticipantId);
  const itemsPerPage = 5;
  const now = new Date();
  const isSameMonth = (date) =>
    date &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  const filteredChallenges = useMemo(() => {
    return challenges.filter((challenge) => {
      if (challengeFilter === 'all') return true;
      if (challengeFilter === 'active') return challenge.status === 'active';
      if (challengeFilter === 'success')
        return challenge.status === 'success' && isSameMonth(challenge.completedAt);
      if (challengeFilter === 'fail')
        return challenge.status === 'fail' && isSameMonth(challenge.completedAt);
      return true;
    });
  }, [challengeFilter, challenges]);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredChallenges.length / itemsPerPage)
  );
  const safePage = Math.min(challengePage, totalPages);
  const paginatedChallenges = filteredChallenges.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage
  );
  const personalTotal = challenges.length;
  const personalSuccess = challenges.filter((c) => c.status === 'success').length;
  const personalFail = challenges.filter((c) => c.status === 'fail').length;
  const personalActive = challenges.filter((c) => c.status === 'active').length;
  const personalSuccessPercent =
    personalTotal === 0 ? 0 : Math.round((personalSuccess / personalTotal) * 100);
  const averageChallengeBet =
    personalTotal === 0
      ? 0
      : Math.round(
          challenges.reduce((sum, challenge) => sum + challenge.bet, 0) /
            personalTotal
        );
  const daysSinceLoginChange = lastLoginChange
    ? Math.floor((Date.now() - lastLoginChange) / msInDay)
    : null;
  const loginDaysLeft =
    lastLoginChange === null
      ? 0
      : Math.max(0, LOGIN_CHANGE_COOLDOWN_DAYS - daysSinceLoginChange);
  const canChangeLogin =
    lastLoginChange === null || daysSinceLoginChange >= LOGIN_CHANGE_COOLDOWN_DAYS;

  const inputThemeStyle = {
    color: textColor,
    borderColor: '#E5E7EB',
    backgroundColor: isDark ? '#0B1220' : '#FFFFFF',
  };

  const totalDays = doneDays + failedDays + inProgressDays;
  const successPercent =
    totalDays === 0 ? 0 : Math.round((doneDays / totalDays) * 100);
  const perWeekPreview = Number(challengePerWeek);
  const allowedMisses = Number.isFinite(perWeekPreview)
    ? Math.max(0, WEEK_LENGTH_DAYS - perWeekPreview)
    : null;
  const betPreview = Number(challengeBet);
  const remainingBalance = Number.isFinite(betPreview)
    ? balance - betPreview
    : null;
  const hasEnoughBalance =
    remainingBalance !== null && Number.isFinite(remainingBalance)
      ? remainingBalance >= 0
      : false;

  const addHabit = () => {
    if (!habitTitle.trim()) return;
    const newHabit = {
      id: Date.now().toString(),
      title: habitTitle.trim(),
      description: habitDescription.trim(),
      progress: 0,
    };
    setHabits((prev) => [newHabit, ...prev]);
    setHabitTitle('');
    setHabitDescription('');
  };

  const incrementHabit = (id) => {
    setHabits((prev) =>
      prev.map((h) =>
        h.id === id ? { ...h, progress: h.progress + 1 } : h
      )
    );
    // Каждое успешное выполнение привычки считаем выполненным днём
    setDoneDays((prev) => prev + 1);
  };

  const joinChallenge = () => {
    setGroupError('');
    if (participants.length >= MAX_PARTICIPANTS) {
      setGroupError('Челлендж заполнен.');
      showToast('warning', 'Челлендж заполнен.');
      return;
    }

    const trimmedName = nickname.trim() || loginName.trim();
    if (!trimmedName) {
      setGroupError('Укажи ник для участия.');
      showToast('error', 'Укажи ник для участия.');
      return;
    }

    const exists = participants.some(
      (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (exists) {
      setGroupError('Такой ник уже есть в списке.');
      showToast('warning', 'Такой ник уже есть.');
      return;
    }

    const isMe = !myParticipantId;
    if (isMe && balance < ENTRY_FEE) {
      setGroupError('Недостаточно баланса для взноса 500 ₽.');
      showToast('error', 'Недостаточно баланса.');
      return;
    }

    const newParticipant = {
      id: Date.now().toString(),
      name: trimmedName,
      joinedAt: Date.now(),
      status: 'in_progress',
      isMe,
    };

    setParticipants((prev) => [...prev, newParticipant]);
    setNickname('');

    if (isMe) {
      setMyParticipantId(newParticipant.id);
      setBalance((prev) => prev - ENTRY_FEE);
      setTotalBets((prevTotal) => {
        const newTotal = prevTotal + ENTRY_FEE;
        const newCount =
          (prevTotal === 0
            ? 1
            : Math.round(prevTotal / (averageBet || ENTRY_FEE))) + 1;
        const newAverage = Math.round(newTotal / newCount);
        setAverageBet(newAverage);
        return newTotal;
      });
    }
    showToast('success', 'Участие подтверждено.');
  };

  const updateParticipantStatus = (id) => {
    setParticipants((prev) =>
      prev.map((participant) => {
        if (participant.id !== id || participant.isMe) return participant;
        const nextStatus =
          participant.status === 'in_progress'
            ? 'success'
            : participant.status === 'success'
            ? 'fail'
            : 'in_progress';
        return { ...participant, status: nextStatus };
      })
    );
  };

  const renderHabit = ({ item }) => (
    <View style={[styles.card, { backgroundColor: cardColor }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: textColor }]}>
          {item.title}
        </Text>
        <TouchableOpacity
          style={styles.smallPurpleButton}
          onPress={() => incrementHabit(item.id)}
        >
          <Text style={styles.smallPurpleButtonText}>+1</Text>
        </TouchableOpacity>
      </View>
      {item.description ? (
        <Text style={[styles.cardSubtitle, { color: secondaryText }]}>
          {item.description}
        </Text>
      ) : null}
      <Text style={[styles.progressText, { color: secondaryText }]}>
        Завершено: {item.progress}
      </Text>
    </View>
  );

  const cycleAvatar = () => {
    setAvatarIndex((prev) => (prev + 1) % avatarOptions.length);
  };

  const pickAvatarImage = async () => {
    try {
      setAvatarError('');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setAvatarError('Нужно разрешение на доступ к фото.');
        showToast('warning', 'Доступ к фото запрещён.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;
      const selected = result.assets && result.assets[0];
      if (!selected?.uri) {
        setAvatarError('Не удалось выбрать фото.');
        showToast('error', 'Ошибка выбора фото.');
        return;
      }

      setAvatarUri(selected.uri);
      showToast('success', 'Аватар обновлён.');
    } catch (error) {
      console.error('Failed to pick avatar image:', error);
      setAvatarError('Ошибка при выборе фото.');
      showToast('error', 'Ошибка при выборе фото.');
    }
  };

  const renderBackButton = () =>
    screen !== 'home' ? (
      <TouchableOpacity
        onPress={() => setScreen('home')}
        style={styles.backButton}
      >
        <Text style={styles.backButtonText}>
          ← Назад в меню
        </Text>
      </TouchableOpacity>
    ) : null;

  const renderBrandHeader = (subtitle = 'Фитнес‑трекер привычек с социальной ответственностью') => (
    <View style={styles.brandHeader}>
      <View style={styles.brandRow}>
        <Image source={require('./assets/icon.png')} style={styles.brandIcon} />
        <Text style={styles.brandTitle}>HabitForge</Text>
      </View>
      <Text style={styles.brandSubtitle}>{subtitle}</Text>
    </View>
  );

  const handleLoginChange = () => {
    const nextLogin = loginDraft.trim();
    if (!nextLogin) {
      setLoginError('Укажи логин.');
      showToast('error', 'Логин не задан.');
      return;
    }
    if (!canChangeLogin) {
      setLoginError(`Можно менять через ${loginDaysLeft} дн.`);
      showToast('warning', 'Смена логина пока недоступна.');
      return;
    }
    setLoginName(nextLogin);
    setLastLoginChange(Date.now());
    setLoginError('');
    showToast('success', 'Логин обновлён.');
  };

  const handleAuthSubmit = async () => {
    setAuthError('');
    if (authMode === 'register') {
      const trimmedName = authName.trim();
      const trimmedEmail = authEmail.trim();
      if (trimmedName.length < 5) {
        setAuthError('Логин должен быть минимум 5 символов.');
        return;
      }
      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
      if (!emailValid) {
        setAuthError('Укажи корректную почту.');
        return;
      }
      if (!authPassword.trim()) {
        setAuthError('Заполни пароль.');
        return;
      }
      const trimmedPassword = authPassword.trim();

      const nextUser = {
        name: trimmedName,
        email: trimmedEmail,
        password: trimmedPassword,
      };
      setRegisteredUser(nextUser);
      // Локальная регистрация без API.
      const nextLogin = trimmedName;
      setLoginName(nextLogin);
      setLoginDraft(nextLogin);
      setIsAuthenticated(true);
      setScreen('home');
      await persistAuthState({
        isAuthenticated: true,
        loginName: nextLogin,
        registeredUser: nextUser,
        balance,
      });
      return;
    }

    if (!registeredUser) {
      setAuthError('Сначала зарегистрируйся.');
      return;
    }

    const trimmedLogin = loginInput.trim();
    if (!trimmedLogin) {
      setAuthError('Укажи логин или почту.');
      return;
    }
    if (!loginPassword.trim()) {
      setAuthError('Введи пароль.');
      return;
    }

    const loginMatches =
      trimmedLogin === registeredUser.name ||
      trimmedLogin.toLowerCase() === registeredUser.email.toLowerCase();
    const passwordMatches = loginPassword.trim() === registeredUser.password;
    if (!loginMatches || !passwordMatches) {
      setAuthError('Неверный логин или пароль.');
      return;
    }

    setLoginName(registeredUser.name);
    setLoginDraft(registeredUser.name);
    setIsAuthenticated(true);
    setScreen('home');
    await persistAuthState({
      isAuthenticated: true,
      loginName: registeredUser.name,
      registeredUser,
      balance,
    });
  };

  const handleLogout = async () => {
    setIsAuthenticated(false);
    await clearAuthState();
  };

  const addPersonalChallenge = () => {
    setChallengeError('');
    const activeCount = challenges.filter((c) => c.status === 'active').length;
    if (activeCount >= 5) {
      setChallengeError('Максимум 5 активных челленджей.');
      showToast('warning', 'Достигнут лимит активных челленджей.');
      return;
    }
    if (!challengeExercise.trim()) {
      setChallengeError('Укажи упражнение.');
      showToast('error', 'Заполни упражнение.');
      return;
    }
    if (!challengeRepsTime.trim()) {
      setChallengeError('Укажи повторения или время за подход.');
      showToast('error', 'Заполни повторения или время.');
      return;
    }
    const repsNumber = Number(challengeRepsTime);
    if (!Number.isFinite(repsNumber) || repsNumber <= 0 || repsNumber > 30) {
      setChallengeError('Повторений в подходе должно быть от 1 до 30.');
      showToast('error', 'Повторения должны быть 1–30.');
      return;
    }
    const setsNumber = Number(challengeSets);
    if (!Number.isFinite(setsNumber) || setsNumber <= 0 || setsNumber > 15) {
      setChallengeError('Количество подходов должно быть от 1 до 15.');
      showToast('error', 'Подходов должно быть 1–15.');
      return;
    }
    const perWeekNumber = Number(challengePerWeek);
    if (!Number.isFinite(perWeekNumber) || perWeekNumber < 3 || perWeekNumber > 6) {
      setChallengeError('Тренировок в неделю должно быть от 3 до 6.');
      showToast('error', 'Частота должна быть от 3 до 6.');
      return;
    }
    const betNumber = Number(challengeBet);
    if (!Number.isFinite(betNumber) || betNumber < 500 || betNumber > 1500) {
      setChallengeError('Ставка должна быть от 500 до 1500 ₽.');
      showToast('error', 'Ставка должна быть 500–1500 ₽.');
      return;
    }

    const newChallenge = {
      id: Date.now().toString(),
      exercise: challengeExercise.trim(),
      repsTime: challengeRepsTime.trim(),
      sets: setsNumber,
      perWeek: perWeekNumber,
      bet: betNumber,
      failMode: challengeFailMode,
      createdAt: Date.now(),
      status: 'active',
      completedAt: null,
    };

    setChallenges((prev) => [newChallenge, ...prev]);
    setChallengeRepsTime('');
    setChallengeSets('');
    setChallengePerWeek('3');
    setChallengeBet('500');
    showToast('success', 'Челлендж добавлен.');
  };

  const removeChallenge = (challenge) => {
    const allowedMs = DELETE_WINDOW_HOURS * 60 * 60 * 1000;
    if (Date.now() - challenge.createdAt > allowedMs) {
      showToast('warning', 'Удаление доступно только в первые 12 часов.');
      return;
    }
    setChallenges((prev) =>
      prev.filter((item) => item.id !== challenge.id)
    );
    showToast('success', 'Челлендж удалён.');
  };

  const updateChallengeStatus = (challengeId, nextStatus) => {
    setChallenges((prev) =>
      prev.map((challenge) => {
        if (challenge.id !== challengeId) return challenge;
        return {
          ...challenge,
          status: nextStatus,
          completedAt: nextStatus === 'active' ? null : Date.now(),
        };
      })
    );
    if (nextStatus === 'success') {
      showToast('success', 'Челлендж отмечен как выполненный.');
    }
    if (nextStatus === 'fail') {
      showToast('warning', 'Челлендж отмечен как срыв.');
    }
  };

  const applyChallengeFilter = (filter) => {
    setChallengeFilter(filter);
    setChallengePage(1);
  };

  const finalizeWeek = () => {
    if (weeklyOutcome) return;
    setGroupError('');
    if (!isJoined) {
      setGroupError('Сначала вступи в челлендж.');
      showToast('warning', 'Сначала вступи в челлендж.');
      return;
    }
    if (!canFinalizeWeek) {
      setGroupError('Неделя ещё не завершена.');
      showToast('warning', 'Неделя ещё не завершена.');
      return;
    }

    const outcome = 'success';
    setWeeklyOutcome(outcome);
    setParticipants((prev) =>
      prev.map((participant) =>
        participant.id === myParticipantId
          ? { ...participant, status: outcome }
          : participant
      )
    );
    if (outcome === 'success') {
      setBalance((prev) => prev + ENTRY_FEE);
      showToast('success', 'Неделя завершена: успех.');
    } else {
      showToast('error', 'Неделя завершена: срыв.');
    }
  };

  const resetWeeklyChallenge = () => {
    const newStart = getWeekStartDate();
    setWeeklyStartAt(newStart);
    setWeeklyExercises(pickWeeklyExercises(exerciseOptions));
    setWeeklyOutcome(null);
    setParticipants([]);
    setMyParticipantId(null);
    setNickname('');
    setGroupError('');
    showToast('success', 'Новая неделя запущена.');
  };

  const topUpBalance = (amount) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    setBalance((prev) => prev + amount);
    showToast('success', `Баланс пополнен на ${amount} ₽`);
  };

  const formatShortDate = (date) =>
    date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });

  const toastStyles = {
    success: { background: '#DCFCE7', border: '#16A34A', text: '#14532D' },
    warning: { background: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
    error: { background: '#FEE2E2', border: '#DC2626', text: '#991B1B' },
  };

  const renderAuthScreen = () => (
    <View style={styles.section}>
      <View style={styles.logoContainer}>
        <Image
          source={require('./assets/icon.png')}
          style={styles.appIcon}
        />
      </View>
      <Text style={[styles.homeTitle, { color: PURPLE, marginTop: 16 }]}>HabitForge</Text>
      <Text style={[styles.sectionSubtitle, { color: secondaryText, marginTop: 8 }]}>
        Создай аккаунт и начни формировать новые привычки.
      </Text>

      <View style={styles.inputCard}>
        <View style={styles.authToggleRow}>
          <TouchableOpacity
            style={[
              styles.authToggleButton,
              authMode === 'register' && styles.authToggleActive,
            ]}
            onPress={() => {
              setAuthMode('register');
              setAuthError('');
            }}
          >
            <Text
              style={[
                styles.authToggleText,
                authMode === 'register' && styles.authToggleTextActive,
              ]}
            >
              Регистрация
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.authToggleButton,
              authMode === 'login' && styles.authToggleActive,
            ]}
            onPress={() => {
              setAuthMode('login');
              setAuthError('');
            }}
          >
            <Text
              style={[
                styles.authToggleText,
                authMode === 'login' && styles.authToggleTextActive,
              ]}
            >
              Вход
            </Text>
          </TouchableOpacity>
        </View>

        {authMode === 'register' ? (
          <>
            <TextInput
              placeholder="Логин (минимум 5 символов)"
              placeholderTextColor={secondaryText}
              value={authName}
              onChangeText={setAuthName}
              style={[styles.input, inputThemeStyle]}
            />

            <TextInput
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={secondaryText}
              value={authEmail}
              onChangeText={setAuthEmail}
              style={[styles.input, inputThemeStyle]}
            />

            <TextInput
              placeholder="Пароль"
              secureTextEntry
              placeholderTextColor={secondaryText}
              value={authPassword}
              onChangeText={setAuthPassword}
              style={[styles.input, inputThemeStyle]}
            />
          </>
        ) : (
          <>
            <TextInput
              placeholder="Логин или почта"
              placeholderTextColor={secondaryText}
              value={loginInput}
              onChangeText={setLoginInput}
              style={[styles.input, inputThemeStyle]}
              autoCapitalize="none"
            />
            <TextInput
              placeholder="Пароль"
              secureTextEntry
              placeholderTextColor={secondaryText}
              value={loginPassword}
              onChangeText={setLoginPassword}
              style={[styles.input, inputThemeStyle]}
            />
          </>
        )}

        {authError ? (
          <Text style={[styles.authErrorText, { color: '#DC2626' }]}>
            {authError}
          </Text>
        ) : null}

        <TouchableOpacity style={styles.primaryButton} onPress={handleAuthSubmit}>
          <Text style={styles.primaryButtonText}>
            {authMode === 'register' ? 'Зарегистрироваться' : 'Войти'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.authHintText, { color: secondaryText }]}>
          В текущей версии данные хранятся только на устройстве и используются
          как игровой вход без реального аккаунта.
        </Text>
      </View>
    </View>
  );

  const renderHome = () => (
    <View style={styles.section}>
      {renderBrandHeader()}

      <AnimatedCard style={styles.heroCard}>
        <Text style={styles.heroTitle}>Начните фитнес‑челлендж!</Text>
        <Text style={styles.heroSubtitle}>
          Выберите упражнение, задайте план — и придерживайтесь его.
        </Text>

        <GradientButton
          label="+  Новый челлендж"
          onPress={() => {
            setChallengeTab('new');
            setScreen('challenge');
          }}
          style={styles.heroButton}
        />
        <GradientButton
          label="≡  Список челленджей"
          onPress={() => {
            setChallengeTab('list');
            setScreen('challenge');
          }}
          style={styles.heroButton}
          colors={['#8B5CF6', '#A78BFA']}
        />
        <GradientButton
          label="👤  Личный кабинет"
          onPress={() => setScreen('profile')}
          style={styles.heroButton}
          colors={['#F59E0B', '#FBBF24']}
        />
        <GradientButton
          label="❓  Справка"
          onPress={() => setScreen('help')}
          style={styles.heroButton}
          colors={['#7C3AED', '#9F7AEA']}
        />
      </AnimatedCard>

      <Text style={styles.footerNote}>
        🛡️ Все данные хранятся только на этом устройстве.
      </Text>
      <Text style={styles.footerTiny}>HabitForge v3.0 • Сделано с ❤️</Text>
    </View>
  );

  const renderHabitsScreen = () => (
    <View style={styles.section}>
      {renderBackButton()}
      <Text style={[styles.sectionTitle, { color: textColor }]}>
        Мои привычки
      </Text>
      <Text style={[styles.sectionSubtitle, { color: secondaryText }]}>
        Ставь цель, отслеживай прогресс и превращай привычки в игру.
      </Text>

      <View style={styles.inputCard}>
        <TextInput
          placeholder="Цель (например: бег 3 раза в неделю)"
          placeholderTextColor={secondaryText}
          value={habitTitle}
          onChangeText={setHabitTitle}
          style={[styles.input, inputThemeStyle]}
        />
        <TextInput
          placeholder="Краткое описание / правило"
          placeholderTextColor={secondaryText}
          value={habitDescription}
          onChangeText={setHabitDescription}
          style={[styles.input, inputThemeStyle]}
        />
        <TouchableOpacity style={styles.primaryButton} onPress={addHabit}>
          <Text style={styles.primaryButtonText}>Добавить привычку</Text>
        </TouchableOpacity>
      </View>

      {habits.length === 0 ? (
        <Text style={[styles.emptyText, { color: secondaryText }]}>
          Пока нет привычек. Начни с первой цели выше.
        </Text>
      ) : (
        <FlatList
          data={habits}
          keyExtractor={(item) => item.id}
          renderItem={renderHabit}
          scrollEnabled={false}
        />
      )}
    </View>
  );

  const renderChallengeScreen = () => (
    <View style={styles.section}>
      {renderBackButton()}
      {renderBrandHeader()}
      <View style={styles.challengeTabRow}>
        <TouchableOpacity
          style={[
            styles.challengeTabButton,
            challengeTab === 'new' && styles.challengeTabButtonActive,
          ]}
          onPress={() => setChallengeTab('new')}
        >
          <Text
            style={[
              styles.challengeTabText,
              challengeTab === 'new' && styles.challengeTabTextActive,
            ]}
          >
            Новый челлендж
          </Text>
        </TouchableOpacity>
        {challengeTab === 'list' ? (
          <TouchableOpacity
            style={[
              styles.challengeTabButton,
              challengeTab === 'list' && styles.challengeTabButtonActive,
            ]}
            onPress={() => setChallengeTab('list')}
          >
            <Text
              style={[
                styles.challengeTabText,
                challengeTab === 'list' && styles.challengeTabTextActive,
              ]}
            >
              Список челленджей
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {challengeTab === 'list' ? (
        <>
          <TouchableOpacity style={styles.weekBanner} activeOpacity={0.9}>
            <Text style={styles.weekBannerText}>👥  ОБЩИЙ ЧЕЛЛЕНДЖ НЕДЕЛИ</Text>
          </TouchableOpacity>

          <View style={[styles.card, { backgroundColor: cardColor }]}>
            <Text style={[styles.listTitle, { color: textColor }]}>
              ☰ Все челленджи
            </Text>
            <View style={styles.sectionUnderline} />
            <Text style={[styles.sectionSubtitle, { color: secondaryText }]}>
              Максимум 5 активных челленджей одновременно
            </Text>

        <View style={styles.filterRow}>
          {[
            { id: 'all', label: 'Все челленджи' },
            { id: 'active', label: 'В процессе' },
            { id: 'success', label: 'Выполнено' },
            { id: 'fail', label: 'Срыв', fullWidth: true },
          ].map((item) => {
            const isSelected = challengeFilter === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.filterButton,
                  item.fullWidth && styles.filterButtonFull,
                  isSelected && styles.filterButtonActive,
                ]}
                onPress={() => applyChallengeFilter(item.id)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    isSelected && styles.filterButtonTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {paginatedChallenges.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyStateIcon}>📋</Text>
            <Text style={[styles.emptyStateTitle, { color: textColor }]}>
              Пока нет челленджей
            </Text>
            <Text style={[styles.emptyStateSubtitle, { color: secondaryText }]}>
              Создайте свой первый челлендж!
            </Text>
          </View>
        ) : (
          <View>
            {paginatedChallenges.map((challenge) => {
              const canDelete =
                Date.now() - challenge.createdAt <=
                DELETE_WINDOW_HOURS * 60 * 60 * 1000;
              return (
                <AnimatedCard key={challenge.id} style={styles.challengeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: textColor }]}>
                      {challenge.exercise}
                    </Text>
                    <Text style={[styles.cardSubtitle, { color: secondaryText }]}>
                      {challenge.repsTime} · {challenge.sets} подходов · {challenge.perWeek} в неделю
                    </Text>
                    <Text style={[styles.cardSubtitle, { color: secondaryText }]}>
                      Ставка: {challenge.bet} ₽ · При срыве:{' '}
                      {challenge.failMode === 'charity' ? 'благотворительность' : 'общий котёл'}
                    </Text>
                    <View style={styles.challengeStatusRow}>
                      {['active', 'success', 'fail'].map((status) => {
                        const isActive = challenge.status === status;
                        const label =
                          status === 'active'
                            ? 'Активен'
                            : status === 'success'
                            ? 'Успех'
                            : 'Срыв';
                        return (
                          <TouchableOpacity
                            key={`${challenge.id}-${status}`}
                            style={[
                              styles.statusChip,
                              isActive && styles.statusChipActive,
                            ]}
                            onPress={() => updateChallengeStatus(challenge.id, status)}
                          >
                            <Text
                              style={[
                                styles.statusChipText,
                                isActive && styles.statusChipTextActive,
                              ]}
                            >
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.smallPurpleButton,
                      !canDelete && styles.disabledSmallButton,
                    ]}
                    onPress={() => removeChallenge(challenge)}
                    disabled={!canDelete}
                  >
                    <Text style={styles.smallPurpleButtonText}>
                      {canDelete ? 'Удалить' : '12ч прошло'}
                    </Text>
                  </TouchableOpacity>
                </AnimatedCard>
              );
            })}
          </View>
        )}

        {totalPages > 1 ? (
          <View style={styles.paginationRow}>
            <TouchableOpacity
              style={[
                styles.smallOutlineButton,
                safePage === 1 && styles.disabledSmallButton,
              ]}
              onPress={() => setChallengePage(Math.max(1, safePage - 1))}
              disabled={safePage === 1}
            >
              <Text style={[styles.smallOutlineButtonText, { color: PURPLE }]}>
                Назад
              </Text>
            </TouchableOpacity>
            <Text style={[styles.cardSubtitle, { color: secondaryText }]}>
              Страница {safePage} / {totalPages}
            </Text>
            <TouchableOpacity
              style={[
                styles.smallOutlineButton,
                safePage === totalPages && styles.disabledSmallButton,
              ]}
              onPress={() => setChallengePage(Math.min(totalPages, safePage + 1))}
              disabled={safePage === totalPages}
            >
              <Text style={[styles.smallOutlineButtonText, { color: PURPLE }]}>
                Вперёд
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
        </>
      ) : null}

      {challengeTab === 'new' ? (
        <View style={styles.inputCard}>
          <Text style={[styles.formLabel, { color: textColor }]}>
            УПРАЖНЕНИЕ
          </Text>
          <TextInput
            placeholder="Например: отжимания или планка"
            placeholderTextColor={secondaryText}
            value={challengeExercise}
            onChangeText={setChallengeExercise}
            style={[styles.input, inputThemeStyle]}
          />

          <Text style={[styles.formLabel, { color: textColor }]}>
            ПОВТОРЕНИЙ В ПОДХОДЕ
          </Text>
          <TextInput
            placeholder="Количество повторений"
            keyboardType="number-pad"
            placeholderTextColor={secondaryText}
            value={challengeRepsTime}
            onChangeText={setChallengeRepsTime}
            style={[styles.input, inputThemeStyle]}
          />
          <Text style={[styles.formHelper, { color: secondaryText }]}>
            Лимит: 1–30
          </Text>
          <Text style={[styles.formLabel, { color: textColor }]}>
            ПОДХОДОВ ЗА ТРЕНИРОВКУ
          </Text>
          <TextInput
            placeholder="Количество подходов"
            keyboardType="number-pad"
            placeholderTextColor={secondaryText}
            value={challengeSets}
            onChangeText={setChallengeSets}
            style={[styles.input, inputThemeStyle]}
          />
          <Text style={[styles.formHelper, { color: secondaryText }]}>
            Лимит: 1–15
          </Text>
          <Text style={[styles.formLabel, { color: textColor }]}>
            ТРЕНИРОВОК В НЕДЕЛЮ
          </Text>
          <TextInput
            placeholder="Тренировок в неделю (3–6)"
            keyboardType="number-pad"
            placeholderTextColor={secondaryText}
            value={challengePerWeek}
            onChangeText={setChallengePerWeek}
            style={[styles.input, inputThemeStyle]}
          />
          <Text style={[styles.formHelper, { color: secondaryText }]}>
            Лимит: 3–6
          </Text>
          <Text
            style={[
              styles.formHelper,
              { color: isDark ? '#FBBF24' : '#F59E0B' },
            ]}
          >
            Допустимо пропусков:{' '}
            {allowedMisses === null ? '—' : allowedMisses}
          </Text>

          <Text style={[styles.formLabel, { color: textColor }]}>
            💰 ВАША СТАВКА (₽)
          </Text>
          <TextInput
            placeholder="Ставка (500–1500 ₽)"
            keyboardType="number-pad"
            placeholderTextColor={secondaryText}
            value={challengeBet}
            onChangeText={setChallengeBet}
            style={[styles.input, inputThemeStyle]}
          />
          <Text style={[styles.formHelper, { color: secondaryText }]}>
            Лимит: 500–1500 ₽
          </Text>
          <View
            style={[
              styles.balanceNotice,
              { backgroundColor: hasEnoughBalance ? '#DCFCE7' : '#FEE2E2' },
            ]}
          >
            <Text
              style={[
                styles.balanceNoticeText,
                { color: hasEnoughBalance ? '#065F46' : '#991B1B' },
              ]}
            >
              {hasEnoughBalance
                ? `Средств достаточно. Останется: ${remainingBalance ?? 0} ₽`
                : 'Недостаточно средств.'}
            </Text>
          </View>

          <Text style={[styles.formLabel, { color: textColor }]}>
            ЧТО ПРОИСХОДИТ ПРИ СРЫВЕ?
          </Text>
          <TouchableOpacity
            style={[
              styles.selectField,
              { borderColor: '#E5E7EB', backgroundColor: inputThemeStyle.backgroundColor },
            ]}
            onPress={() =>
              setChallengeFailMode((prev) => (prev === 'charity' ? 'pool' : 'charity'))
            }
            activeOpacity={0.8}
          >
            <Text style={[styles.selectFieldText, { color: textColor }]}>
              {challengeFailMode === 'charity'
                ? 'На благотворительность'
                : 'В общий котёл'}
            </Text>
            <Text style={[styles.selectFieldIcon, { color: secondaryText }]}>
              ▼
            </Text>
          </TouchableOpacity>

          {challengeError ? (
            <Text style={[styles.authErrorText, { color: '#DC2626' }]}>
              {challengeError}
            </Text>
          ) : null}

          <TouchableOpacity
            style={[
              styles.primaryButton,
              personalActive >= 5 && styles.disabledButton,
            ]}
            onPress={addPersonalChallenge}
            disabled={personalActive >= 5}
          >
            <Text style={styles.primaryButtonText}>
              {personalActive >= 5
                ? 'Лимит активных челленджей'
                : 'НАЧАТЬ ЧЕЛЛЕНДЖ'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setChallengeTab('list')}
          >
            <Text style={styles.secondaryButtonText}>ОТМЕНА</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {challengeTab === 'list' ? (
        <>
          <Text style={[styles.sectionTitle, { color: textColor, marginTop: 8 }]}>
            🏆 Общий челлендж недели
          </Text>
          <Text style={[styles.sectionSubtitle, { color: secondaryText }]}>
            Запускается каждый понедельник. Длительность — {WEEK_LENGTH_DAYS} дней.
          </Text>

          <View style={[styles.card, { backgroundColor: cardColor }]}>
            <Text style={[styles.cardTitle, { color: textColor }]}>
              📅 Неделя челленджа
            </Text>
        <Text style={[styles.cardSubtitle, { color: secondaryText }]}>
          Старт: {formatShortDate(weeklyStartAt)} (понедельник)
        </Text>
        <Text style={[styles.cardSubtitle, { color: secondaryText }]}>
          Финиш: {formatShortDate(weeklyEndAt)}
        </Text>
        <Text style={[styles.cardSubtitle, { color: secondaryText }]}>
          Упражнения недели: {weeklyExercises.join(', ')}
        </Text>
        <Text style={[styles.cardSubtitle, { color: secondaryText }]}>
          Частота тренировок в неделю
        </Text>
        <View style={styles.optionRow}>
          {weeklyFrequencyOptions.map((value) => {
            const isSelected = value === weeklyFrequency;
            return (
              <TouchableOpacity
                key={`freq-${value}`}
                style={[
                  styles.optionChip,
                  isSelected && styles.optionChipActive,
                ]}
                onPress={() => setWeeklyFrequency(value)}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    isSelected && styles.optionChipTextActive,
                  ]}
                >
                  {value} / нед
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.inputCard}>
        <Text style={[styles.cardTitle, { color: textColor }]}>
          🪙 Участие и приз
        </Text>
        <TextInput
          placeholder="Ваш ник в челлендже"
          placeholderTextColor={secondaryText}
          value={nickname}
          onChangeText={(value) => {
            setNickname(value);
            setGroupError('');
          }}
          style={[styles.input, inputThemeStyle]}
        />
        {groupError ? (
          <Text style={[styles.authErrorText, { color: '#DC2626' }]}>
            {groupError}
          </Text>
        ) : null}
        <TouchableOpacity
          style={[
            styles.primaryButton,
            participants.length >= MAX_PARTICIPANTS && styles.disabledButton,
          ]}
          onPress={joinChallenge}
          disabled={participants.length >= MAX_PARTICIPANTS}
        >
          <Text style={styles.primaryButtonText}>
            {participants.length >= MAX_PARTICIPANTS
              ? '🚫 Челлендж заполнен'
              : `✅ Вступить за ${ENTRY_FEE} ₽`}
          </Text>
        </TouchableOpacity>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: secondaryText }]}>
              👥 Участники
            </Text>
            <Text style={[styles.statValue, { color: textColor }]}>
              {participants.length} / {MAX_PARTICIPANTS}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: secondaryText }]}>
              💰 Призовой фонд
            </Text>
            <Text style={[styles.statValue, { color: textColor }]}>
              {prizePool} ₽
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: secondaryText }]}>
              🎁 Базовый приз
            </Text>
            <Text style={[styles.statValueSmall, { color: textColor }]}>
              {BASE_PRIZE} ₽
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: secondaryText }]}>
              🏅 Победителей
            </Text>
            <Text style={[styles.statValueSmall, { color: textColor }]}>
              {winnersCount || 0}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: secondaryText }]}>
              💵 Взнос
            </Text>
            <Text style={[styles.statValueSmall, { color: textColor }]}>
              {ENTRY_FEE} ₽
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: secondaryText }]}>
              🧾 Выплата на победителя
            </Text>
            <Text style={[styles.statValueSmall, { color: textColor }]}>
              {payoutPerWinner} ₽
            </Text>
          </View>
        </View>

        <Text style={[styles.cardSubtitle, { color: secondaryText }]}>
          При успехе ставка возвращается. При срыве уходит в призовой фонд.
        </Text>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            (!canFinalizeWeek || !isJoined || weeklyOutcome) &&
              styles.disabledButton,
          ]}
          onPress={finalizeWeek}
          disabled={!canFinalizeWeek || !isJoined || weeklyOutcome}
        >
          <Text style={styles.primaryButtonText}>
            {weeklyOutcome
              ? 'Итог зафиксирован'
              : canFinalizeWeek
              ? 'Завершить неделю'
              : 'Неделя ещё идёт'}
          </Text>
        </TouchableOpacity>

        {weekEnded ? (
          <TouchableOpacity
            style={styles.smallOutlineButton}
            onPress={resetWeeklyChallenge}
          >
            <Text style={[styles.smallOutlineButtonText, { color: PURPLE }]}>
              Новая неделя
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: cardColor }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            👥 Участники недели
          </Text>
        </View>

        {participants.length === 0 ? (
          <Text
            style={[
              styles.emptyText,
              { color: secondaryText, marginTop: 4 },
            ]}
          >
            Пока никто не вступил в челлендж.
          </Text>
        ) : (
          <View>
            {participants.map((participant, index) => (
              <View key={participant.id} style={styles.participantRow}>
                <Text
                  style={[styles.participantIndex, { color: secondaryText }]}
                >
                  #{index + 1}
                </Text>
                <Text style={[styles.participantName, { color: textColor }]}>
                  {participant.name}
                  {participant.isMe ? ' (ты)' : ''}
                </Text>
                <TouchableOpacity
                  style={styles.statusBadge}
                  onPress={() => updateParticipantStatus(participant.id)}
                  disabled={participant.isMe}
                >
                  <Text style={styles.statusBadgeText}>
                    {participant.status === 'success'
                      ? 'успех'
                      : participant.status === 'fail'
                      ? 'срыв'
                      : 'в процессе'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
        </>
      ) : null}
    </View>
  );

  const renderProfileScreen = () => (
    <View style={styles.section}>
      {renderBackButton()}
      {renderBrandHeader()}
      <Text style={[styles.sectionTitle, { color: textColor }]}>
        Личный кабинет
      </Text>
      <Text style={[styles.sectionSubtitle, { color: secondaryText }]}>
        Следи за своим прогрессом и настрой свой образ в HabitForge.
      </Text>

      <View style={[styles.card, { backgroundColor: cardColor }]}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarCircle}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {avatarOptions[avatarIndex]}
              </Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: textColor }]}>
              Твой аватар
            </Text>
            <Text style={[styles.cardSubtitle, { color: secondaryText }]}>
              Загрузи фото или выбери эмодзи.
            </Text>
            <View style={styles.avatarButtonsRow}>
              <TouchableOpacity
                style={styles.smallOutlineButton}
                onPress={pickAvatarImage}
              >
                <Text style={[styles.smallOutlineButtonText, { color: PURPLE }]}>
                  Загрузить фото
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.smallOutlineButton}
                onPress={() => setAvatarUri('')}
              >
                <Text style={[styles.smallOutlineButtonText, { color: PURPLE }]}>
                  Сбросить фото
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.smallGhostButton}
              onPress={cycleAvatar}
            >
              <Text style={[styles.smallGhostButtonText, { color: PURPLE }]}>
                Сменить эмодзи
              </Text>
            </TouchableOpacity>
            {avatarError ? (
              <Text style={[styles.authErrorText, { color: '#DC2626' }]}>
                {avatarError}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: cardColor }]}>
        <Text style={[styles.cardTitle, { color: textColor }]}>
          Логин
        </Text>
        <Text style={[styles.cardSubtitle, { color: secondaryText }]}>
          Менять логин можно раз в 2 недели.
        </Text>

        <TextInput
          placeholder="Новый логин"
          placeholderTextColor={secondaryText}
          value={loginDraft}
          onChangeText={(value) => {
            setLoginDraft(value);
            setLoginError('');
          }}
          style={[styles.input, inputThemeStyle]}
        />

        {loginError ? (
          <Text style={[styles.authErrorText, { color: '#DC2626' }]}>
            {loginError}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[
            styles.primaryButton,
            !canChangeLogin && styles.disabledButton,
          ]}
          onPress={handleLoginChange}
          disabled={!canChangeLogin}
        >
          <Text style={styles.primaryButtonText}>
            {canChangeLogin
              ? 'Сохранить логин'
              : `Доступно через ${loginDaysLeft} дн.`}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.cardSubtitle, { color: secondaryText }]}>
          Текущий логин: {loginName || 'не задан'}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: cardColor }]}>
        <Text style={[styles.cardTitle, { color: textColor }]}>
          Ваша статистика
        </Text>
        <Text style={[styles.statsHeroValue, { color: PURPLE }]}>
          {personalTotal}
        </Text>
        <Text style={[styles.statsHeroLabel, { color: secondaryText }]}>
          ВСЕГО ЧЕЛЛЕНДЖЕЙ
        </Text>

        <View style={styles.statsGrid}>
          <View style={[styles.statsTile, styles.statsTileSuccess]}>
            <Text style={[styles.statsTileValue, { color: '#10B981' }]}>
              {personalSuccess}
            </Text>
            <Text style={[styles.statsTileLabel, { color: secondaryText }]}>
              ВЫПОЛНЕНО
            </Text>
          </View>
          <View style={[styles.statsTile, styles.statsTileFail]}>
            <Text style={[styles.statsTileValue, { color: '#EF4444' }]}>
              {personalFail}
            </Text>
            <Text style={[styles.statsTileLabel, { color: secondaryText }]}>
              СРЫВОВ
            </Text>
          </View>
          <View style={[styles.statsTile, styles.statsTileActive]}>
            <Text style={[styles.statsTileValue, { color: PURPLE }]}>
              {personalActive}
            </Text>
            <Text style={[styles.statsTileLabel, { color: secondaryText }]}>
              В ПРОЦЕССЕ
            </Text>
          </View>
          <View style={[styles.statsTile, styles.statsTileTotal]}>
            <Text style={[styles.statsTileValue, { color: PURPLE }]}>
              {totalDays}
            </Text>
            <Text style={[styles.statsTileLabel, { color: secondaryText }]}>
              ВСЕГО ДНЕЙ
            </Text>
          </View>
        </View>

        <Text style={[styles.statsHeroValue, { color: PURPLE }]}>
          {successPercent}%
        </Text>
        <Text style={[styles.statsHeroLabel, { color: secondaryText }]}>
          ОБЩАЯ УСПЕШНОСТЬ
        </Text>

        <Text style={[styles.statsDetailTitle, { color: textColor }]}>
          📊 Детальная статистика:
        </Text>
        <Text style={[styles.profileStatLine, { color: textColor }]}>
          ✅ Выполнено: {doneDays} дней
        </Text>
        <Text style={[styles.profileStatLine, { color: textColor }]}>
          ❌ Пропущено: {failedDays} дней
        </Text>
        <Text style={[styles.profileStatLine, { color: textColor }]}>
          💰 Всего ставок: {totalBets} ₽
        </Text>
        <Text style={[styles.profileStatLine, { color: textColor }]}>
          🎯 Средняя ставка: {averageBet} ₽
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: cardColor }]}>
        <Text style={[styles.cardTitle, { color: textColor }]}>
          💳 Баланс
        </Text>
        <Text style={[styles.cardSubtitle, { color: secondaryText }]}>
          Баланс используется только для ставок и пополняется админом.
        </Text>

        <View style={styles.balanceRow}>
          <Text style={[styles.statLabel, { color: secondaryText }]}>
            Текущий баланс
          </Text>
          <Text style={[styles.balanceValue, { color: textColor }]}>
            {balance} ₽
          </Text>
        </View>
        <View style={styles.topUpButtonsRow}>
          {[500, 1000, 2000].map((amount) => (
            <TouchableOpacity
              key={`topup-${amount}`}
              style={styles.topUpButton}
              onPress={() => topUpBalance(amount)}
            >
              <Text style={styles.topUpButtonText}>+{amount} ₽</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutButtonText}>🚪 Выход из аккаунта</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHelpScreen = () => (
    <View style={styles.section}>
      {renderBackButton()}
      {renderBrandHeader()}
      <Text style={[styles.sectionTitle, { color: textColor }]}>
        ❓ Справка по интерфейсу
      </Text>
      <Text style={[styles.sectionSubtitle, { color: secondaryText }]}>
        ℹ️ Краткое описание возможностей HabitForge и как ими пользоваться.
      </Text>

      <View style={[styles.card, { backgroundColor: cardColor }]}>
        <Text style={[styles.cardTitle, { color: textColor }]}>
          🧭 Главные разделы
        </Text>
        <Text style={[styles.cardSubtitle, { color: secondaryText }]}>
          - 🎯 «Мои привычки» — создавай привычки, нажимай «+1» за каждый выполненный день.{'\n'}
          - 🏆 «Общий челлендж» — недельный челлендж до 10 участников со ставкой 500 ₽.{'\n'}
          - 👤 «Личный кабинет» — смотри статистику успехов, срывов и ставок, меняй аватар.{'\n'}
          - 🌗 Переключатель темы в правом верхнем углу — светлый/тёмный режим интерфейса.
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: cardColor }]}>
        <Text style={[styles.cardTitle, { color: textColor }]}>
          💸 Деньги и ответственность
        </Text>
        <Text style={[styles.cardSubtitle, { color: secondaryText }]}>
          В разделе челленджа считается призовой фонд: базовый приз + взносы участников. {'\n'}
          ⚠️ Реальные переводы денег и онлайн‑игра между людьми потребуют отдельного сервера и платёжных интеграций — в текущей версии приложение работает как симулятор.
        </Text>
      </View>
    </View>
  );

  const toastTranslate = toastAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-12, 0],
  });
  const activeToast = toast ? toastStyles[toast.type] : null;
  return (
    <View
      style={[
        styles.safe,
        { backgroundColor: isDark ? '#0B1120' : '#EEF2FF' },
      ]}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />
        <View style={[styles.container, { backgroundColor: 'transparent' }]}>
          <ParticleBackground isDark={isDark} />
          {toast && activeToast ? (
            <Animated.View
              style={[
                styles.toast,
                {
                  backgroundColor: activeToast.background,
                  borderColor: activeToast.border,
                  opacity: toastAnim,
                  transform: [{ translateY: toastTranslate }],
                },
              ]}
            >
              <Text style={[styles.toastText, { color: activeToast.text }]}>
                {toast.message}
              </Text>
            </Animated.View>
          ) : null}

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <View style={styles.headerRight}>
            {isAuthenticated ? (
              <View style={styles.balanceBadge}>
                <Text style={styles.balanceBadgeText}>
                  💳 Баланс: {balance} ₽
                </Text>
              </View>
            ) : null}
              <TouchableOpacity
                style={[
                  styles.themeButton,
                  { borderColor: isDark ? DARK_TEXT : PURPLE },
                ]}
                onPress={() => setIsDark((prev) => !prev)}
              >
                <Text
                  style={[
                    styles.themeButtonText,
                    { color: isDark ? DARK_TEXT : PURPLE },
                  ]}
                >
                  {isDark ? 'Светлая' : 'Тёмная'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {!isAuthenticated && renderAuthScreen()}
            {isAuthenticated && screen === 'home' && renderHome()}
            {isAuthenticated && screen === 'habits' && renderHabitsScreen()}
            {isAuthenticated && screen === 'challenge' && renderChallengeScreen()}
            {isAuthenticated && screen === 'profile' && renderProfileScreen()}
            {isAuthenticated && screen === 'help' && renderHelpScreen()}
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  headerSpacer: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  balanceBadge: {
    backgroundColor: '#10B981',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  balanceBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    marginTop: 4,
    fontSize: 12,
  },
  themeButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 2,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  themeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  toast: {
    position: 'absolute',
    top: 8,
    left: 16,
    right: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  inputCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 4,
  },
  formHelper: {
    fontSize: 12,
    marginBottom: 8,
  },
  balanceNotice: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  balanceNoticeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectField: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  selectFieldText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectFieldIcon: {
    fontSize: 12,
  },
  primaryButton: {
    backgroundColor: PURPLE,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.5,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 13,
  },
  card: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  weekBanner: {
    backgroundColor: PURPLE,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  weekBannerText: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  listTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  sectionUnderline: {
    width: 60,
    height: 4,
    borderRadius: 999,
    backgroundColor: PURPLE,
    marginTop: 6,
    marginBottom: 12,
  },
  challengeTabRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  challengeTabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeTabButtonActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  challengeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  challengeTabTextActive: {
    color: '#FFFFFF',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  filterButton: {
    flexGrow: 1,
    flexBasis: '30%',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonFull: {
    flexBasis: '100%',
  },
  filterButtonActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  emptyStateCard: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#DDD6FE',
    borderStyle: 'dashed',
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FBFBFF',
    marginBottom: 12,
  },
  emptyStateIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyStateSubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  secondaryButton: {
    marginTop: 10,
    backgroundColor: '#A78BFA',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  progressText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '500',
  },
  smallPurpleButton: {
    backgroundColor: PURPLE,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  disabledSmallButton: {
    opacity: 0.5,
  },
  smallPurpleButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  cardRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  progressBlock: {
    marginTop: 8,
  },
  progressLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  progressBar: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22C55E',
  },
  progressFillWarning: {
    height: '100%',
    backgroundColor: '#F59E0B',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  optionChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  optionChipActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  optionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  optionChipTextActive: {
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statValueSmall: {
    fontSize: 14,
    fontWeight: '600',
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  challengeStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  statusChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  statusChipActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusChipTextActive: {
    color: '#FFFFFF',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  weekDaysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  weekDayCard: {
    width: '30%',
    minWidth: 90,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 8,
    backgroundColor: '#F9FAFB',
  },
  weekDayLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  weekDayActions: {
    flexDirection: 'row',
    gap: 6,
  },
  weekDayButton: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  weekDayButtonDone: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
  },
  weekDayButtonFail: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
  },
  weekDayButtonText: {
    fontSize: 14,
  },
  weekDayButtonTextActive: {
    fontWeight: '700',
  },
  statusBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
  },
  participantIndex: {
    fontSize: 12,
    width: 26,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '500',
  },
  winnerCard: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  winnerLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  winnerName: {
    fontSize: 14,
    fontWeight: '700',
  },
  backButton: {
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: PURPLE,
  },
  brandSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  appIcon: {
    width: 120,
    height: 120,
    borderRadius: 24,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  homeTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  homeSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    textAlign: 'center',
  },
  menuButtons: {
    marginTop: 8,
    gap: 10,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginTop: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  heroButton: {
    marginBottom: 10,
  },
  gradientButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  gradientButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 16,
  },
  footerTiny: {
    textAlign: 'center',
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  menuButton: {
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  menuButtonHabits: {
    backgroundColor: '#7C3AED',
  },
  menuButtonChallenge: {
    backgroundColor: '#7C3AED',
  },
  menuButtonProfile: {
    backgroundColor: '#F97316',
  },
  menuButtonHelp: {
    backgroundColor: '#7C3AED',
  },
  menuButtonTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 6,
  },
  avatarCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: PURPLE,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: {
    fontSize: 36,
  },
  avatarImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  smallGhostButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    marginTop: 4,
    marginBottom: 4,
  },
  smallGhostButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  profileButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  smallOutlineButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E8FF',
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  smallOutlineButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  profileStatLine: {
    marginTop: 4,
    fontSize: 13,
  },
  statsHeroValue: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
  },
  statsHeroLabel: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 12,
    gap: 12,
  },
  statsTile: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  statsTileSuccess: {
    borderTopWidth: 4,
    borderTopColor: '#10B981',
  },
  statsTileFail: {
    borderTopWidth: 4,
    borderTopColor: '#EF4444',
  },
  statsTileActive: {
    borderTopWidth: 4,
    borderTopColor: PURPLE,
  },
  statsTileTotal: {
    borderTopWidth: 4,
    borderTopColor: PURPLE,
  },
  statsTileValue: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
  },
  statsTileLabel: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  statsDetailTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  authErrorText: {
    fontSize: 12,
    marginBottom: 4,
  },
  authHintText: {
    fontSize: 11,
    marginTop: 8,
  },
  authToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  authToggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authToggleActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  authToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  authToggleTextActive: {
    color: '#FFFFFF',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  balanceBar: {
    backgroundColor: '#BBF7D0',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#22C55E',
    marginBottom: 10,
  },
  balanceBarText: {
    color: '#14532D',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  topUpButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 6,
  },
  topUpButton: {
    flex: 1,
    backgroundColor: '#22C55E',
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  topUpButtonText: {
    color: '#ECFDF3',
    fontWeight: '800',
    fontSize: 13,
  },
  logoutButton: {
    backgroundColor: '#DC2626',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: '#991B1B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});

