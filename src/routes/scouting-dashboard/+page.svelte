<script>
	import Navbar from '../../components/navbar.svelte';
	import Footer from '../../components/footer.svelte';
	import CoverageMap from '../../components/scoutingDashboard/CoverageMap.svelte';
	import SimulatorHeader from '../../components/scoutingDashboard/SimulatorHeader.svelte';
	import SimulatorTeamCard from '../../components/scoutingDashboard/SimulatorTeamCard.svelte';
	import ContextMenu from '../../components/scoutingDashboard/ContextMenu.svelte';
	import RPCards from '../../components/scoutingDashboard/RPCards.svelte';
	import EventProgressMap from '../../components/scoutingDashboard/EventProgressMap.svelte';
	import PlayoffProgressMap from '../../components/scoutingDashboard/PlayoffProgressMap.svelte';
	import OverrideContextMenu from '../../components/scoutingDashboard/OverrideContextMenu.svelte';
	import { onMount } from 'svelte';
	import { Line } from 'svelte-chartjs';
	import {
		Chart as ChartJS,
		Title,
		Tooltip,
		Legend,
		LineElement,
		LinearScale,
		PointElement,
		CategoryScale
	} from 'chart.js';

	ChartJS.register(Title, Tooltip, Legend, LineElement, LinearScale, PointElement, CategoryScale);

	let scoutingData = [];
	let pitData = [];
	let schedule = []; // All matches from TBA
	let eventTeams = []; // All teams at the event from TBA
	let loading = true;
	let loadingSteps = {
		scoutingData: false,
		pitData: false,
		eventStats: false,
		schedule: false,
		eventTeams: false,
		teamStats: false,
		teamColors: false,
		teamDetails: false,
		rankings: false,
		yearStats: false
	};
	let currentStep = '';
	let error = null;
	let searchTerm = '';
	let selectedRow = null;
	let selectedTeamMatches = [];
	let teamStatsMap = new Map(); 
	let teamColorsMap = new Map();
	let teamDetailsMap = new Map();
	let matchResultsMap = new Map();
	let eventRankings = [];
	let eventOprs = {}; 
	let teamStats = null; 
	let yearStats = null;
	let statsLoading = false;
	let pitMode = false;
	let simulatorMode = false;
	let selectionMode = false;
	let overviewMode = false;
	let selectionSearchTerm = '';
	let defenseMode = false;
	let scoutLeadMode = false;
	let simRedTeams = ['', '', ''];
	let simBlueTeams = ['', '', ''];
	let overviewTeam = '1757';
	let overviewDataView = false;
	let showSosLeaderboard = false;
	let quickLinksOpen = false;
	let isFullscreen = false;
	let matchOverrides = new Map();
	let actualAlliances = [];
	let playoffSchedule = [];
	let playoffOverrides = new Map();

	const posMap = {
		'OT': 'Outpost Trench',
		'OBFT': 'Outpost Bump Favoring Trench',
		'OBFH': 'Outpost Bump Favoring Hub',
		'H': 'Hub',
		'DBFH': 'Depot Bump Favoring Hub',
		'DBFT': 'Depot Bump Favoring Trench',
		'DT': 'Depot Trench',
		'NS': 'No Show'
	};

	$: scoutLeadData = schedule.map(m => {
		const scoutedTeamsInMatch = new Set(
			scoutingData
				.filter(r => getVal(r, 'Match #') == m.match_number)
				.map(r => getVal(r, 'Team #'))
		);
		
		const allTeams = [
			...m.alliances.red.team_keys.map(k => ({ team: k.replace('frc', ''), alliance: 'red' })),
			...m.alliances.blue.team_keys.map(k => ({ team: k.replace('frc', ''), alliance: 'blue' }))
		];

		const missing = allTeams.filter(t => !scoutedTeamsInMatch.has(t.team));
		
		if (missing.length === 0) return null;

		return {
			match_number: m.match_number,
			missing,
			videos: m.videos || []
		};
	}).filter(Boolean);

	$: allianceSimulation = (() => {
		const rankings = predictedRankings || eventRankings;
		if (!rankings || rankings.length === 0) return [];

		const teamsWithMetricsMap = new Map(allTeamsList.map(tNum => {
			const stats = teamStatsMap.get(tNum) || { epa: 0 };
			const opr = eventOprs[`frc${tNum}`] || 0;
			return [tNum, { teamNum: tNum, epa: stats.epa, opr: opr }];
		}));

		let rankingList = rankings.map(r => r.team_key.replace('frc', ''));
		let picked = new Set();
		let alliances = [];

		const getBestEPAAvailable = () => {
			return allTeamsList
				.filter(t => !picked.has(t))
				.sort((a, b) => (teamsWithMetricsMap.get(b)?.epa || 0) - (teamsWithMetricsMap.get(a)?.epa || 0))[0];
		};

		// Round 1: Captains and their first picks
		for (let i = 0; i < 8; i++) {
			// The captain is the highest ranked team remaining
			let captain = rankingList.find(t => !picked.has(t));
			if (!captain) break;

			picked.add(captain);
			let alliance = { captain, picks: [] };

			// Captain picks the best EPA available
			let best = getBestEPAAvailable();
			if (best) {
				alliance.picks.push(best);
				picked.add(best);
			}
			alliances.push(alliance);
		}
		
		// Round 2: Snake draft (8 back to 1)
		for (let i = alliances.length - 1; i >= 0; i--) {
			let best = getBestEPAAvailable();
			if (best) {
				alliances[i].picks.push(best);
				picked.add(best);
			}
		}

		return alliances;
	})();

	$: effectiveAlliances = actualAlliances.length > 0
		? actualAlliances.map(a => {
			const activePickKeys = a.backup
				? a.picks.filter(p => p !== a.backup.out)
				: a.picks;
			return {
				captain: activePickKeys[0]?.replace('frc', ''),
				picks: activePickKeys.slice(1).map(p => p.replace('frc', '')),
				allPicks: a.picks.map(p => p.replace('frc', '')),
				backup: a.backup ? { in: a.backup.in.replace('frc', ''), out: a.backup.out.replace('frc', '') } : null
			};
		})
		: allianceSimulation;

	$: bracketSimulation = ((overrides, _playoffs) => {
		if (effectiveAlliances.length < 8) return null;

		const getAllianceEPA = (alliance) => {
			if (!alliance) return 0;
			return (teamStatsMap.get(alliance.captain)?.epa || 0) +
				alliance.picks.reduce((acc, p) => acc + (teamStatsMap.get(p)?.epa || 0), 0);
		};

		// Map set_number to playoff match for actual results lookup
		// Only map semifinal matches (comp_level 'sf') by set_number
		// Grand finals (comp_level 'f') are mapped separately to M14/M15
		const playoffResultMap = new Map();
		playoffSchedule.forEach(m => {
			if (m.comp_level === 'f') {
				// Grand finals match 1 → M14, match 2 → M15 (tiebreaker)
				if (m.match_number === 1) playoffResultMap.set(14, m);
				if (m.match_number === 2) playoffResultMap.set(15, m);
			} else {
				playoffResultMap.set(m.set_number, m);
			}
		});

		const getAllianceNum = (alliance) => effectiveAlliances.indexOf(alliance) + 1;

		const predictOrActual = (a1, a2, label) => {
			const matchNum = parseInt(label.replace('M', ''));
			const actual = playoffResultMap.get(matchNum);
			const epa1 = getAllianceEPA(a1);
			const epa2 = getAllianceEPA(a2);

			// Check for actual played result
			if (actual && actual.winning_alliance) {
				const redScore = actual.alliances?.red?.score ?? -1;
				const blueScore = actual.alliances?.blue?.score ?? -1;
				const winnerIsRed = actual.winning_alliance === 'red';
				return {
					label, a1, a2, epa1, epa2,
					winProb: winnerIsRed ? 1 : 0,
					winner: winnerIsRed ? a1 : a2,
					loser: winnerIsRed ? a2 : a1,
					played: true,
					redScore, blueScore,
					override: false
				};
			}

			// Check for user override
			const override = overrides.get(label);
			if (override) {
				const winner = override === 'a1' ? a1 : a2;
				const loser = override === 'a1' ? a2 : a1;
				const diff = epa1 - epa2;
				const winProb = getWinProb(diff);
				return {
					label, a1, a2, epa1, epa2, winProb,
					winner, loser,
					played: false,
					override: override
				};
			}

			// Fall back to EPA prediction
			const diff = epa1 - epa2;
			const winProb = getWinProb(diff);
			return {
				label, a1, a2, epa1, epa2, winProb,
				winner: winProb > 0.5 ? a1 : a2,
				loser: winProb > 0.5 ? a2 : a1,
				played: false,
				override: false
			};
		};

		const alliances = effectiveAlliances.slice(0, 8);

		// Round 1 (Upper)
		const m1 = predictOrActual(alliances[0], alliances[7], 'M1');
		const m2 = predictOrActual(alliances[3], alliances[4], 'M2');
		const m3 = predictOrActual(alliances[1], alliances[6], 'M3');
		const m4 = predictOrActual(alliances[2], alliances[5], 'M4');

		// Lower R2
		const m5 = predictOrActual(m1.loser, m2.loser, 'M5');
		const m6 = predictOrActual(m3.loser, m4.loser, 'M6');

		// Upper R2
		const m7 = predictOrActual(m1.winner, m2.winner, 'M7');
		const m8 = predictOrActual(m3.winner, m4.winner, 'M8');

		// Lower R3
		const m9 = predictOrActual(m8.loser, m5.winner, 'M9');
		const m10 = predictOrActual(m7.loser, m6.winner, 'M10');

		// Upper Final
		const m11 = predictOrActual(m7.winner, m8.winner, 'M11');

		// Lower R4
		const m12 = predictOrActual(m9.winner, m10.winner, 'M12');

		// Lower Final
		const m13 = predictOrActual(m11.loser, m12.winner, 'M13');

		// Grand Finals
		const m14 = predictOrActual(m11.winner, m13.winner, 'M14');

		// Check for tiebreaker (M15)
		const tiebreakerActual = playoffSchedule.find(m => m.comp_level === 'f' && m.match_number === 2);
		let m15 = null;
		if (tiebreakerActual) {
			m15 = predictOrActual(m14.a1, m14.a2, 'M15');
		}

		const allMatches = [m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14];
		if (m15) allMatches.push(m15);

		return {
			upper: [
				{ name: 'Round 1', matches: [m1, m2, m3, m4] },
				{ name: 'Round 2', matches: [m7, m8] },
				{ name: 'Upper Final', matches: [m11] }
			],
			lower: [
				{ name: 'Lower R2', matches: [m5, m6] },
				{ name: 'Lower R3', matches: [m9, m10] },
				{ name: 'Lower R4', matches: [m12] },
				{ name: 'Lower Final', matches: [m13] }
			],
			matches: allMatches,
			finals: m15 || m14,
			tiebreaker: m15,
			alliances: effectiveAlliances
		};
	})(playoffOverrides, playoffSchedule);

	function getWinProb(scoreDiff) {
		const score_sd = yearStats?.score_sd || 20;
		return 1 / (1 + Math.pow(10, (-5/8 * scoreDiff) / score_sd));
	}

	$: simWinProbs = (() => {
		const epaDiff = simAggregates.red.epa - simAggregates.blue.epa;
		const oprDiff = simAggregates.red.opr - simAggregates.blue.opr;
		return {
			epa: getWinProb(epaDiff),
			opr: getWinProb(oprDiff)
		};
	})();

	$: redFlagWatchlist = allTeamsList.map(tNum => {
		const issues = getMatchesWithIssues(tNum);
		if (issues.length === 0) return null;
		return { teamNum: tNum, issues };
	}).filter(Boolean).sort((a, b) => b.issues.length - a.issues.length);

	$: teamMomentum = allTeamsList.map(tNum => {
		const teamRows = scoutingData
			.filter(r => getVal(r, 'Team #') === tNum)
			.sort((a, b) => parseInt(getVal(a, 'Match #')) - parseInt(getVal(b, 'Match #')));
		
		if (teamRows.length < 2) return null;

		const split = Math.max(1, Math.floor(teamRows.length / 2));
		const early = teamRows.slice(0, split);
		const recent = teamRows.slice(-split);

		const getAvgEff = (rows) => rows.reduce((acc, r) => acc + (parseFloat(getVal(r, 'Scoring effectiveness?')) || 0), 0) / rows.length;
		
		const earlyEff = getAvgEff(early);
		const recentEff = getAvgEff(recent);
		const diff = recentEff - earlyEff;

		return { teamNum: tNum, earlyEff, recentEff, diff };
	}).filter(Boolean).sort((a, b) => b.diff - a.diff);

	$: autoStartDistribution = selectedTeamMatches.reduce((acc, m) => {
		const pos = getVal(m, 'Starting position?');
		if (pos && pos !== 'N/A') {
			acc[pos] = (acc[pos] || 0) + 1;
		}
		return acc;
	}, {});

	function clearSimulator() {
		simRedTeams = ['', '', ''];
		simBlueTeams = ['', '', ''];
	}

	let crossedOffTeams = new Set();
	function toggleCrossOff(teamNum) {
		if (crossedOffTeams.has(teamNum)) {
			crossedOffTeams.delete(teamNum);
		} else {
			crossedOffTeams.add(teamNum);
		}
		crossedOffTeams = crossedOffTeams; // Trigger Svelte reactivity
	}

	const funMessages = [
		'Recalibrating flux capacitors...',
		'Optimizing intake geometry...',
		'Analyzing PID coefficients...',
		'Tuning Kalman filters...',
		'Scanning for swerve modules...',
		'Greasing the drivetrain...',
		'Inflating pneumatics...',
		'Calibrating vision sensors...',
		'Synchronizing CAN bus...',
		'Charging high-power batteries...',
		'Initializing autonomous routines...',
		'Verifying driver station link...',
		'Checking robot signal light...',
		'Polling for scouting data...',
		'Baking cookies for the judges...',
    'Asking for a replay...',
    'Giving a ref an uno reverse card...',
    'Pretending to understand the rules...',
    'Trying to find the ball under the field...',
    'Secretly hoping for a rain delay...',
    'Running away to join the circus...',
    'Consulting the magic 8-ball for match predictions...',
    'Asking the team mascot for advice...',
    'Bribing the head ref with cookies...',
    'Trying to decode the secret handshake for alliance selection...',
    'Attempting to communicate with the robot using Morse code...',
    'Setting up a betting pool on match outcomes...',
    'Trying to find the hidden Easter egg in the scouting data...',
    'Asking the team psychologist for insights on team performance...',
    'Consulting the ancient scrolls of FRC wisdom...',
    'Trying to summon the spirit of Dean Kamen for guidance...',
    'Banishing the spirit of Dean Kamen to keep YPP...',
	];
	let currentMessageIndex = Math.floor(Math.random() * funMessages.length);

	// Video sync
	let videoCurrentTime = 0;
	let videoElement = null;
	let videosCollapsed = false;

	// Debug mode: null = live, 'quals' = test quals only, 'playoffs' = test quals + playoffs
	let debugMode = null;

	// Context menu for simulator
	let contextMenu = null;
	let contextMenuMatch = null;
	let overrideContextMenu = null;
	let overrideContextMenuLabel = '';
	let overrideContextMenuType = null;
	let overrideContextMenuRedLabel = 'Override Red';
	let overrideContextMenuBlueLabel = 'Override Blue';

	// Image viewer
	let viewerImageSrc = null;
	let viewerScale = 1;
	let viewerTranslateX = 0;
	let viewerTranslateY = 0;
	let isDragging = false;
	let dragStartX = 0;
	let dragStartY = 0;

	function openImageViewer(imageSrc) {
		viewerImageSrc = imageSrc;
		viewerScale = 1;
		viewerTranslateX = 0;
		viewerTranslateY = 0;
	}

	function closeImageViewer() {
		viewerImageSrc = null;
		viewerScale = 1;
		viewerTranslateX = 0;
		viewerTranslateY = 0;
		isDragging = false;
	}

	function handleViewerWheel(e) {
		e.preventDefault();
		const delta = e.deltaY > 0 ? -0.1 : 0.1;
		viewerScale = Math.max(0.5, Math.min(5, viewerScale + delta));
	}

	function handleViewerMouseDown(e) {
		if (viewerScale > 1) {
			isDragging = true;
			dragStartX = e.clientX - viewerTranslateX;
			dragStartY = e.clientY - viewerTranslateY;
		}
	}

	function handleViewerMouseMove(e) {
		if (isDragging) {
			viewerTranslateX = e.clientX - dragStartX;
			viewerTranslateY = e.clientY - dragStartY;
		}
	}

	function handleViewerMouseUp() {
		isDragging = false;
	}

	function handleViewerTouchStart(e) {
		if (e.touches.length === 1 && viewerScale > 1) {
			isDragging = true;
			dragStartX = e.touches[0].clientX - viewerTranslateX;
			dragStartY = e.touches[0].clientY - viewerTranslateY;
		}
	}

	function handleViewerTouchMove(e) {
		if (isDragging && e.touches.length === 1) {
			e.preventDefault();
			viewerTranslateX = e.touches[0].clientX - dragStartX;
			viewerTranslateY = e.touches[0].clientY - dragStartY;
		}
	}

	function handleViewerTouchEnd() {
		isDragging = false;
	}

	// Sorting
	let sortKey = 'EPA';
	let sortOrder = -1; // Default to descending for leaderboard

	const CSV_URL = import.meta.env.VITE_SCOUTING_CSV_URL;
	const PIT_CSV_URL = import.meta.env.VITE_PIT_CSV_URL;
	const TBA_KEY = import.meta.env.VITE_TBA_KEY;
	const EVENT_KEY = import.meta.env.VITE_EVENT_KEY || '2026rikin';
	const FILTER_TIME = import.meta.env.VITE_FILTER_TIME || '';
	const PIT_SCOUTING_FORM_URL = import.meta.env.VITE_PIT_SCOUTING_FORM_URL;
	const CURRENT_YEAR = 2026;

	async function fetchTeamColors(teamNumber) {
		if (!teamNumber || teamColorsMap.has(teamNumber)) return teamColorsMap.get(teamNumber);
		try {
			const res = await fetch(`https://api.frc-colors.com/v1/team/${teamNumber}`);
			if (res.ok) {
				const data = await res.json();
				const colors = {
					primary: ensureContrast(data.primaryHex || '#3b82f6'),
					secondary: ensureContrast(data.secondaryHex || '#1e40af')
				};
				teamColorsMap.set(teamNumber, colors);
				teamColorsMap = teamColorsMap;
				saveCache();
				return colors;
			}
		} catch (e) {
			console.error(`Error fetching colors for ${teamNumber}:`, e);
		}
		return { primary: '#3b82f6', secondary: '#1e40af' };
	}

	function getLuminance(hex) {
		const rgb = hex.replace('#', '').match(/.{2}/g).map(x => {
			const c = parseInt(x, 16) / 255;
			return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
		});
		return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
	}

	function ensureContrast(hex, threshold = 0.15) {
		if (!hex) return '#3b82f6';
		let currentHex = hex;
		let luminance = getLuminance(currentHex);
		
		// If color is too dark for the dark theme, lighten it
		if (luminance < threshold) {
			const rgb = hex.replace('#', '').match(/.{2}/g).map(x => parseInt(x, 16));
			const lightened = rgb.map(c => Math.round(c + (255 - c) * 0.4));
			return '#' + lightened.map(x => x.toString(16).padStart(2, '0')).join('');
		}
		return currentHex;
	}

	function parseCSV(text, skipRows = 2) {
		const rows = [];
		let currentRow = [];
		let currentField = '';
		let inQuotes = false;

		for (let i = 0; i < text.length; i++) {
			const char = text[i];
			const nextChar = text[i + 1];

			if (inQuotes) {
				if (char === '"' && nextChar === '"') {
					currentField += '"';
					i++;
				} else if (char === '"') {
					inQuotes = false;
				} else {
					currentField += char;
				}
			} else {
				if (char === '"') {
					inQuotes = true;
				} else if (char === ',') {
					currentRow.push(currentField);
					currentField = '';
				} else if (char === '\r' || char === '\n') {
					currentRow.push(currentField);
					if (currentRow.length > 0) rows.push(currentRow);
					currentRow = [];
					currentField = '';
					if (char === '\r' && nextChar === '\n') i++;
				} else {
					currentField += char;
				}
			}
		}
		if (currentField || currentRow.length > 0) {
			currentRow.push(currentField);
			rows.push(currentRow);
		}

		if (rows.length <= skipRows) return [];
		const headers = rows[skipRows - 1].map(h => h.trim());
		return rows.slice(skipRows).map(row => {
			const obj = {};
			headers.forEach((header, i) => {
				const key = header || `column_${i}`;
				obj[key] = row[i] ? row[i].trim() : '';
			});
			return obj;
		});
	}

	async function fetchData(force = false) {
		try {
			loading = true;
      console.log('Starting data fetch with force=', force);
			currentStep = '';
      loadingSteps = {
        scoutingData: false,
        pitData: false,
        eventStats: false,
        schedule: false,
        teamStats: false,
        teamColors: false,
        teamDetails: false
      };
      if(force){
        scoutingData = [];
        pitData = [];
        teamStatsMap = new Map();
        teamColorsMap = new Map();
        teamDetailsMap = new Map();
      }
			
			if (force || scoutingData.length === 0) {
				currentStep = 'scoutingData';
				loadingSteps.scoutingData = true;
				const csvUrl = debugMode ? '/test-data/scouting.csv' : CSV_URL;
				const res = await fetch(csvUrl);
				if (res.ok) {
					const text = await res.text();
					const rawScouting = parseCSV(text, 2);
					scoutingData = rawScouting
						.map(row => {
							const teamNum = getVal(row, 'Team #');
							if (teamNum && teamNum !== 'N/A') {
								// Strip leading zeros
								row['Team #'] = teamNum.replace(/^0+/, '');
							}
							return row;
						})
						.filter(row => {
							const teamNum = getVal(row, 'Team #');
							const matchNum = getVal(row, 'Match #');
							return teamNum && teamNum !== 'N/A' && matchNum && matchNum !== 'N/A' && filterByTime(row);
						});
				}
				loadingSteps.scoutingData = false;
			}
			if (force || pitData.length === 0) {
				currentStep = 'pitData';
				loadingSteps.pitData = true;
				const pitUrl = debugMode ? '/test-data/pit.csv' : PIT_CSV_URL;
				const resPit = await fetch(pitUrl);
				if (resPit.ok) {
					const textPit = await resPit.text();
					const rawPit = parseCSV(textPit, 1);
					pitData = rawPit
						.map(row => {
							const teamNum = getVal(row, 'Team number');
							if (teamNum && teamNum !== 'N/A') {
								// Strip leading zeros
								row['Team number'] = teamNum.replace(/^0+/, '');
							}
							return row;
						})
						.filter(row => {
							const teamNum = getVal(row, 'Team number');
							return teamNum && teamNum !== 'N/A';
						});
				}
				loadingSteps.pitData = false;
			}
			saveCache();
			
			currentStep = 'eventStats';
			loadingSteps.eventStats = true;
			await fetchEventStats();
			loadingSteps.eventStats = false;
			
			currentStep = 'rankings';
			loadingSteps.rankings = true;
			await fetchEventRankings();
			loadingSteps.rankings = false;

			currentStep = 'schedule';
			loadingSteps.schedule = true;
			await fetchSchedule();
			await fetchActualAlliances();
			loadingSteps.schedule = false;

			currentStep = 'eventTeams';
			loadingSteps.eventTeams = true;
			await fetchEventTeams();
			loadingSteps.eventTeams = false;
			
			currentStep = 'teamStats';
			loadingSteps.teamStats = true;
			await fetchAllTeamStats();
			loadingSteps.teamStats = false;
			
			currentStep = 'teamColors';
			loadingSteps.teamColors = true;
			await fetchAllTeamColors();
			loadingSteps.teamColors = false;

			currentStep = 'teamDetails';
			loadingSteps.teamDetails = true;
			await fetchAllTeamDetails();
			loadingSteps.teamDetails = false;

			currentStep = 'yearStats';
			loadingSteps.yearStats = true;
			await fetchYearStats();
			loadingSteps.yearStats = false;
		} catch (e) {
			error = e.message;
			console.error('Load error:', e);
		} finally {
			loading = false;
			currentStep = '';
		}
	}

	function saveCache() {
		if (typeof window !== 'undefined') {
			localStorage.setItem('scouting_cache', JSON.stringify({
				data: scoutingData,
				pit: pitData,
				teams: eventTeams,
				rankings: eventRankings,
				stats: Array.from(teamStatsMap.entries()),
				colors: Array.from(teamColorsMap.entries()),
				details: Array.from(teamDetailsMap.entries()),
				yearStats: yearStats,
				timestamp: Date.now()
			}));
		}
	}

	async function fetchYearStats() {
		try {
			const res = await fetch(`https://api.statbotics.io/v3/year/${CURRENT_YEAR}`);
			if (res.ok) {
				yearStats = await res.json();
				saveCache();
			}
		} catch (e) {
			console.error('Error fetching year stats:', e);
		}
	}

	async function fetchEventStats() {
		if (debugMode) {
			try {
				const fallback = await fetch('/test-data/oprs.json');
				if (fallback.ok) { const data = await fallback.json(); eventOprs = data.oprs || {}; }
			} catch (e) { console.error('Debug fallback failed:', e); }
			return;
		}
		try {
			const res = await fetch(`https://www.thebluealliance.com/api/v3/event/${EVENT_KEY}/oprs`, {
				headers: { 'X-TBA-Auth-Key': TBA_KEY }
			});
			if (res.ok) {
				const data = await res.json();
				eventOprs = data.oprs || {};
			} else {
				throw new Error('TBA OPR fetch failed');
			}
		} catch (e) {
			console.error('Error fetching TBA OPRs, trying local fallback:', e);
			try {
				const fallback = await fetch('/test-data/oprs.json');
				if (fallback.ok) { const data = await fallback.json(); eventOprs = data.oprs || {}; }
			} catch (e2) { console.error('Local fallback also failed:', e2); }
		}
	}

	async function fetchEventRankings() {
		if (debugMode) {
			try {
				const fallback = await fetch('/test-data/rankings.json');
				if (fallback.ok) { const data = await fallback.json(); eventRankings = data.rankings || []; }
			} catch (e) { console.error('Debug fallback failed:', e); }
			return;
		}
		try {
			const res = await fetch(`https://www.thebluealliance.com/api/v3/event/${EVENT_KEY}/rankings`, {
				headers: { 'X-TBA-Auth-Key': TBA_KEY }
			});
			if (res.ok) {
				const data = await res.json();
				eventRankings = data.rankings || [];
			} else {
				throw new Error('TBA rankings fetch failed');
			}
		} catch (e) {
			console.error('Error fetching TBA rankings, trying local fallback:', e);
			try {
				const fallback = await fetch('/test-data/rankings.json');
				if (fallback.ok) { const data = await fallback.json(); eventRankings = data.rankings || []; }
			} catch (e2) { console.error('Local fallback also failed:', e2); }
		}
	}

	async function fetchSchedule() {
		if (debugMode) {
			try {
				const fallback = await fetch('/test-data/schedule.json');
				if (fallback.ok) {
					const data = await fallback.json();
					schedule = data
						.filter(m => m.comp_level === 'qm')
						.sort((a, b) => a.match_number - b.match_number);
				}
			} catch (e) { console.error('Debug schedule fallback failed:', e); }
			if (debugMode === 'playoffs') {
				try {
					const fallback2 = await fetch('/test-data/playoff-schedule.json');
					if (fallback2.ok) { playoffSchedule = await fallback2.json(); }
				} catch (e) { console.error('Debug playoff schedule fallback failed:', e); }
			} else {
				playoffSchedule = [];
			}
			return;
		}
		try {
			const res = await fetch(`https://www.thebluealliance.com/api/v3/event/${EVENT_KEY}/matches`, {
				headers: { 'X-TBA-Auth-Key': TBA_KEY }
			});
			if (res.ok) {
				const data = await res.json();
				schedule = data
					.filter(m => m.comp_level === 'qm')
					.sort((a, b) => a.match_number - b.match_number);
				playoffSchedule = data
					.filter(m => m.comp_level !== 'qm')
					.sort((a, b) => a.set_number - b.set_number || a.match_number - b.match_number);
			} else {
				throw new Error('TBA schedule fetch failed');
			}
		} catch (e) {
			console.error('Error fetching schedule, trying local fallback:', e);
			try {
				const fallback = await fetch('/test-data/schedule.json');
				if (fallback.ok) {
					const data = await fallback.json();
					schedule = data
						.filter(m => m.comp_level === 'qm')
						.sort((a, b) => a.match_number - b.match_number);
				}
			} catch (e2) { console.error('Local fallback also failed:', e2); }
			try {
				const fallback2 = await fetch('/test-data/playoff-schedule.json');
				if (fallback2.ok) {
					playoffSchedule = await fallback2.json();
				}
			} catch (e2) { console.error('Playoff schedule fallback also failed:', e2); }
		}
	}

	async function fetchActualAlliances() {
		if (debugMode === 'playoffs') {
			try {
				const fallback = await fetch('/test-data/alliances.json');
				if (fallback.ok) { actualAlliances = await fallback.json(); }
			} catch (e) { console.error('Debug alliances fallback failed:', e); }
			return;
		}
		if (debugMode === 'quals') {
			actualAlliances = [];
			return;
		}
		try {
			const res = await fetch(`https://www.thebluealliance.com/api/v3/event/${EVENT_KEY}/alliances`, {
				headers: { 'X-TBA-Auth-Key': TBA_KEY }
			});
			if (res.ok) {
				actualAlliances = await res.json();
			} else {
				throw new Error('TBA alliances fetch failed');
			}
		} catch (e) {
			console.error('Error fetching alliances, trying local fallback:', e);
			try {
				const fallback = await fetch('/test-data/alliances.json');
				if (fallback.ok) {
					actualAlliances = await fallback.json();
				}
			} catch (e2) { console.error('Alliances fallback also failed:', e2); }
		}
	}

	async function fetchEventTeams() {
		if (debugMode) {
			try {
				const fallback = await fetch('/test-data/teams.json');
				if (fallback.ok) {
					const data = await fallback.json();
					eventTeams = data.map(key => key.replace('frc', '')).sort((a, b) => parseInt(a) - parseInt(b));
				}
			} catch (e) { console.error('Debug teams fallback failed:', e); }
			return;
		}
		try {
			const res = await fetch(`https://www.thebluealliance.com/api/v3/event/${EVENT_KEY}/teams/keys`, {
				headers: { 'X-TBA-Auth-Key': TBA_KEY }
			});
			if (res.ok) {
				const data = await res.json();
				eventTeams = data.map(key => key.replace('frc', '')).sort((a, b) => parseInt(a) - parseInt(b));
				saveCache();
			} else {
				throw new Error('TBA event teams fetch failed');
			}
		} catch (e) {
			console.error('Error fetching event teams, trying local fallback:', e);
			try {
				const fallback = await fetch('/test-data/teams.json');
				if (fallback.ok) {
					const data = await fallback.json();
					eventTeams = data.map(key => key.replace('frc', '')).sort((a, b) => parseInt(a) - parseInt(b));
					saveCache();
				}
			} catch (e2) { console.error('Local fallback also failed:', e2); }
		}
	}

	async function fetchAllTeamStats() {
		const uniqueTeams = allTeamsList;
		
		// Filter out teams we already have cached
		const teamsToFetch = uniqueTeams.filter(t => !teamStatsMap.has(t));
		
		if (teamsToFetch.length === 0) return;

		try {
			// Fetch all teams concurrently
			const promises = teamsToFetch.map(teamNum =>
				fetch(`https://api.statbotics.io/v3/team_year/${teamNum}/${CURRENT_YEAR}`)
					.then(res => res.ok ? res.json().then(data => ({ teamNum, data })) : { teamNum, data: null })
					.catch(e => {
						console.error(`Error fetching stats for ${teamNum}:`, e);
						return { teamNum, data: null };
					})
			);

			const results = await Promise.all(promises);

			// Process all results and update map
			let updated = false;
			results.forEach(({ teamNum, data }) => {
				if (data) {
					teamStatsMap.set(teamNum, {
						epa: data?.epa?.total_points?.mean || 0,
						rank: data?.epa?.ranks?.total?.rank || 0,
						norm: data?.epa?.norm || 0,
						rp1: data?.epa?.breakdown?.rp_1 || 0,
						rp2: data?.epa?.breakdown?.rp_2 || 0,
						rp3: data?.epa?.breakdown?.rp_3 || 0
					});
					updated = true;
				}
			});

			if (updated) {
				teamStatsMap = teamStatsMap;
				saveCache();
			}
		} catch (e) {
			console.error('Error fetching team stats:', e);
		}
	}

	async function fetchAllTeamColors() {
		const uniqueTeams = allTeamsList.filter(t => !teamColorsMap.has(t));

		if (uniqueTeams.length === 0) return;

		try {
			// Fetch colors concurrently
			const promises = uniqueTeams.map(teamNum => fetchTeamColors(teamNum));
			await Promise.all(promises);
		} catch (e) {
			console.error('Error prefetching team colors:', e);
		}
	}

	async function fetchAllTeamDetails() {
		const uniqueTeams = allTeamsList.filter(t => !teamDetailsMap.has(t));

		if (uniqueTeams.length === 0) return;

		try {
			// Fetch team details concurrently
			const promises = uniqueTeams.map(teamNum => 
				fetch(`https://www.thebluealliance.com/api/v3/team/frc${teamNum}`, {
					headers: { 'X-TBA-Auth-Key': TBA_KEY }
				}).then(res => res.ok ? res.json().then(data => ({ teamNum, data })) : { teamNum, data: null })
				.catch(e => {
					console.error(`Error fetching TBA details for ${teamNum}:`, e);
					return { teamNum, data: null };
				})
			);

			const results = await Promise.all(promises);
			let updated = false;
			results.forEach(({ teamNum, data }) => {
				if (data) {
					teamDetailsMap.set(teamNum, data);
					updated = true;
				}
			});

			if (updated) {
				teamDetailsMap = teamDetailsMap;
				saveCache();
			}
		} catch (e) {
			console.error('Error prefetching team details:', e);
		}
	}

	async function fetchSelectedTeamDetails(teamNumber) {
		statsLoading = true;
		teamStats = null;
		fetchTeamColors(teamNumber); // Async fetch in background
		
		try {
			let tbaData = teamDetailsMap.get(teamNumber);
			if (!tbaData) {
				const tbaRes = await fetch(`https://www.thebluealliance.com/api/v3/team/frc${teamNumber}`, {
					headers: { 'X-TBA-Auth-Key': TBA_KEY }
				});
				tbaData = tbaRes.ok ? await tbaRes.json() : null;
				if (tbaData) {
					teamDetailsMap.set(teamNumber, tbaData);
					saveCache();
				}
			}

			const global = teamStatsMap.get(teamNumber) || {};
			const opr = eventOprs[`frc${teamNumber}`] || 0;
			const pit = pitData.find(p => getVal(p, 'Team number') === teamNumber);

			// Calculate auto win % and get score how
			const teamRows = scoutingData.filter(r => getVal(r, 'Team #') === teamNumber);
			const autoWins = teamRows.filter(r => {
				const autoVal = getVal(r, 'won auto');
				return autoVal === 'Yes' || autoVal === 'yes' || autoVal === 'Y' || autoVal === 'TRUE';
			}).length;
			const autoWinPercent = teamRows.length > 0 ? (autoWins / teamRows.length) * 100 : 0;

			// Get most recent score how value
			const scoreHowVal = teamRows.length > 0 ? getVal(teamRows[teamRows.length - 1], 'Score how?') : 'N/A';

			teamStats = {
				epa: global.epa || 0,
				rank: global.rank || 'N/A',
				opr: opr,
				nickname: tbaData?.nickname || `Team ${teamNumber}`,
				city: tbaData?.city || '',
				state: tbaData?.state_prov || '',
				pit: pit,
				autoWinPercent: autoWinPercent,
				scoreHow: scoreHowVal
			};
		} catch (e) {
			console.error('Error fetching details:', e);
		} finally {
			statsLoading = false;
		}
	}

	const toggleFullscreen = async () => {
		try {
			if (!document.fullscreenElement) {
				await document.documentElement.requestFullscreen();
				isFullscreen = true;
			} else {
				await document.exitFullscreen();
				isFullscreen = false;
			}
		} catch (err) {
			console.error(`Error attempting to toggle fullscreen: ${err.message}`);
		}
	};

	onMount(() => {
		const messageInterval = setInterval(() => {
			let nextIndex;
			do {
				nextIndex = Math.floor(Math.random() * funMessages.length);
			} while (nextIndex === currentMessageIndex);
			currentMessageIndex = nextIndex;
		}, 3000);

		const handleFullscreenChange = () => {
			isFullscreen = !!document.fullscreenElement;
		};
		document.addEventListener('fullscreenchange', handleFullscreenChange);

		console.log('onMount called, loading:', loading);
		const cached = localStorage.getItem('scouting_cache');
		if (cached) {
			const parsed = JSON.parse(cached);
			const { data, pit, teams, rankings, stats, colors, details, yearStats: cachedYearStats, timestamp } = parsed;
			console.log('Cache found, age:', Date.now() - timestamp);
			if (Date.now() - timestamp < 3600000) {
				console.log('Cache is fresh, loading from cache');
				scoutingData = data.filter(filterByTime);
				pitData = pit || [];
				eventTeams = teams || [];
				eventRankings = rankings || [];
				if (stats) teamStatsMap = new Map(stats);
				if (colors) teamColorsMap = new Map(colors);
				if (details) teamDetailsMap = new Map(details);
				if (cachedYearStats) yearStats = cachedYearStats;
				
				// Still show loading while fetching fresh data
				currentStep = 'eventStats';
				loadingSteps.eventStats = true;
				loading = true;
				fetchEventStats().then(() => {
					loadingSteps.eventStats = false;
					currentStep = 'rankings';
					loadingSteps.rankings = true;
					return fetchEventRankings();
				}).then(() => {
					loadingSteps.rankings = false;
					currentStep = 'schedule';
					loadingSteps.schedule = true;
					return fetchSchedule().then(() => fetchActualAlliances());
				}).then(() => {
					loadingSteps.schedule = false;
					currentStep = 'eventTeams';
					loadingSteps.eventTeams = true;
					return fetchEventTeams();
				}).then(() => {
					loadingSteps.eventTeams = false;
					currentStep = 'teamStats';
					loadingSteps.teamStats = true;
					return fetchAllTeamStats();
				}).then(() => {
					loadingSteps.teamStats = false;
					currentStep = 'yearStats';
					loadingSteps.yearStats = true;
					return fetchYearStats();
				}).then(() => {
					loadingSteps.yearStats = false;
					loading = false;
					currentStep = '';
					console.log('All tasks complete, loading:', loading);
				});
				return () => clearInterval(messageInterval);
			}
		}
		console.log('No cache or cache expired, fetching fresh data');
		fetchData();

		return () => clearInterval(messageInterval);
	});

	function handleSort(key) {
		if (sortKey === key) {
			sortOrder *= -1;
		} else {
			sortKey = key;
			sortOrder = (key === 'Team #' || key === 'Match #') ? 1 : -1;
		}
	}

	function extractNumber(val) {
		if (typeof val === 'number') return val;
		if (!val || val === 'N/A') return 0;
		const match = val.toString().match(/[-+]?\d*\.?\d+/);
		return match ? parseFloat(match[0]) : 0;
	}

	function getSortValue(row, key) {
		const teamNum = getVal(row, 'Team #');
		const metrics = teamMetrics.find(m => m.teamNum === teamNum);
		
		switch (key) {
			case 'Team #': return extractNumber(teamNum);
			case 'Match #': return extractNumber(getVal(row, 'Match #'));
			case 'EPA': return metrics?.epa || 0;
			case 'OPR': return metrics?.opr || 0;
			case 'Climb Rate': return metrics?.climbRate || 0;
			case 'Scout Eff.': return extractNumber(getVal(row, 'Scoring effectiveness?'));
			case 'Avg Eff.': return metrics?.avgEff || 0;
			case 'Samples': return metrics?.entryCount || 0;
      case 'Rank': return metrics?.eventRank || 0;
			default: return 0;
		}
	}

	$: allTeamsList = (eventTeams.length > 0 ? eventTeams : Array.from(new Set([
		...scoutingData.map(r => getVal(r, 'Team #')),
		...pitData.map(p => getVal(p, 'Team number'))
	]))).filter(t => t && t !== 'N/A').sort((a, b) => parseInt(a) - parseInt(b));

	$: teamMetrics = allTeamsList
		.map(teamNum => {
			const rows = scoutingData.filter(r => getVal(r, 'Team #') === teamNum);
			const avgEff = rows.length > 0 ? rows.reduce((acc, r) => acc + (parseFloat(getVal(r, 'Scoring effectiveness?')) || 0), 0) / rows.length : 0;
			const climbRate = rows.length > 0 ? rows.filter(r => {
				const val = getVal(r, 'climb level').toLowerCase();
				return val !== 'no' && val !== 'no climb' && val !== 'f' && val !== 'failed' && val !== 'n/a';
			}).length / rows.length : 0;
			
			const stats = teamStatsMap.get(teamNum) || { epa: 0 };
			const opr = eventOprs[`frc${teamNum}`] || 0;
      const eventRank = eventRankings.find(r => r.team_key === `frc${teamNum}`)?.rank || -1;

			return {
				teamNum,
				avgEff,
				climbRate,
				entryCount: rows.length,
				epa: stats.epa,
        opr: opr,
        eventRank
			};
		});

	$: overviewTeamSchedule = (() => {
		const enrichMatch = (m, team) => {
			if (!m.alliances) return { ...m, alliance: null, swapNeeded: false, isPlayed: false, isPlayoff: false };
			const isRed = team ? m.alliances.red.team_keys.includes(`frc${team}`) : false;
			const alliance = team ? (isRed ? 'red' : 'blue') : null;
			const redScore = m.alliances?.red?.score ?? -1;
			const blueScore = m.alliances?.blue?.score ?? -1;
			const isPlayed = redScore >= 0 && blueScore >= 0 && (redScore > 0 || blueScore > 0);
			return { ...m, alliance, swapNeeded: false, isPlayed, isPlayoff: m.comp_level !== 'qm' };
		};

		if (!overviewTeam) {
			const quals = schedule.map(m => enrichMatch(m, null));
			return quals;
		}

		const teamQuals = schedule
			.filter(m => teamIsInMatch(overviewTeam, m))
			.map((m, idx, arr) => {
				const isRed = m.alliances.red.team_keys.includes(`frc${overviewTeam}`);
				const alliance = isRed ? 'red' : 'blue';
				const nextMatch = arr[idx + 1];
				let swapNeeded = false;
				if (nextMatch) {
					const nextIsRed = nextMatch.alliances.red.team_keys.includes(`frc${overviewTeam}`);
					const nextAlliance = nextIsRed ? 'red' : 'blue';
					swapNeeded = alliance !== nextAlliance;
				}
				const result = getMatchResult(m.match_number);
				return { ...m, alliance, swapNeeded, isPlayed: !!result, isPlayoff: false };
			});

		// Add playoff matches if team is on an alliance
		const playoffMatches = [];
		const allianceIdx = getTeamPlayoffAllianceIndex(overviewTeam);
		if (allianceIdx >= 0 && bracketSimulation) {
			const teamAlliance = effectiveAlliances[allianceIdx];
			const allianceNum = allianceIdx + 1;

			// Check if an alliance object matches the team's alliance by index
			const isTeamAlliance = (a) => {
				if (!a) return false;
				if (a === teamAlliance) return true;
				// Fallback: compare by captain in case object identity differs
				return a.captain === teamAlliance.captain;
			};

			bracketSimulation.matches.forEach(bm => {
				if (!bm.a1 || !bm.a2) return;
				const isA1 = isTeamAlliance(bm.a1);
				const isA2 = isTeamAlliance(bm.a2);
				if (!isA1 && !isA2) return;

				const a1Teams = [bm.a1.captain, ...(bm.a1.picks || [])].map(t => `frc${t}`);
				const a2Teams = [bm.a2.captain, ...(bm.a2.picks || [])].map(t => `frc${t}`);

				// Look up TBA match for time data
				const bmNum = parseInt(bm.label.replace('M', ''));
				const tbaMatch = bmNum >= 14
					? playoffSchedule.find(pm => pm.comp_level === 'f' && pm.match_number === (bmNum - 13))
					: playoffSchedule.find(pm => pm.comp_level !== 'f' && pm.set_number === bmNum);

				playoffMatches.push({
					match_number: bm.label,
					comp_level: 'sf',
					alliances: {
						red: { team_keys: a1Teams, score: bm.played ? (bm.redScore ?? null) : null },
						blue: { team_keys: a2Teams, score: bm.played ? (bm.blueScore ?? null) : null }
					},
					alliance: isA1 ? 'red' : 'blue',
					swapNeeded: false,
					isPlayed: bm.played,
					isPlayoff: true,
					bracketMatch: bm,
					playoffLabel: bm.label,
					time: tbaMatch?.time,
					predicted_time: tbaMatch?.predicted_time,
					actual_time: tbaMatch?.actual_time
				});
			});
		}

		return [...teamQuals, ...playoffMatches];
	})();

	$: sortedLeaderboard = [...teamMetrics].sort((a, b) => {
		let valA, valB;
		if (sortKey === 'Team #') { valA = extractNumber(a.teamNum); valB = extractNumber(b.teamNum); }
		else if (sortKey === 'EPA') { valA = a.epa; valB = b.epa; }
		else if (sortKey === 'OPR') { valA = a.opr; valB = b.opr; }
		else if (sortKey === 'Climb Rate') { valA = a.climbRate; valB = b.climbRate; }
		else if (sortKey === 'Avg Eff.') { valA = a.avgEff; valB = b.avgEff; }
		else if (sortKey === 'Samples') { valA = a.entryCount; valB = b.entryCount; }
    else if (sortKey === 'Rank') { valA = a.eventRank; valB = b.eventRank; }
		else { valA = 0; valB = 0; }

		if (valA < valB) return -1 * sortOrder;
		if (valA > valB) return 1 * sortOrder;
		return 0;
	});

	$: filteredLeaderboard = sortedLeaderboard.filter(m => {
		if (!selectionSearchTerm) return true;
		const teamNum = m.teamNum.toLowerCase();
		const nickname = (teamDetailsMap.get(m.teamNum)?.nickname || '').toLowerCase();
		const term = selectionSearchTerm.toLowerCase();
		return teamNum.includes(term) || nickname.includes(term);
	});

	$: defenseMetrics = scoutingData
		.map(row => {
			const teamNum = getVal(row, 'Team #');
			const matchNum = getVal(row, 'Match #');
			const actions = parseActions(getVal(row, 'actions'));
			
			// Calculate defense time
			let defenseTime = 0;
			actions.forEach(act => {
				if (act.code.includes('def')) {
					// Find corresponding stop or estimate duration
					const codeActions = actions.filter(a => a.code === act.code);
					const startIdx = codeActions.findIndex(a => a === act);
					if (act.type === 'start') {
						const stopAction = codeActions.find((a, idx) => idx > startIdx && a.type === 'stop');
						defenseTime += stopAction ? (stopAction.time - act.time) : 0;
					}
				}
			});

			const defenseScore = parseFloat(getVal(row, 'defense skill')) || 0;
			const comments = getVal(row, 'comments') || '';

			return {
				teamNum,
				matchNum,
				defenseTime,
				defenseScore,
				comments,
				hasDefense: defenseTime > 0 || defenseScore > 0
			};
		})
		.filter(m => m.hasDefense)
		.sort((a, b) => {
			if (sortKey === 'Team #') return (extractNumber(a.teamNum) - extractNumber(b.teamNum)) * sortOrder;
			if (sortKey === 'Match #') return (extractNumber(a.matchNum) - extractNumber(b.matchNum)) * sortOrder;
			if (sortKey === 'Def Time') return (a.defenseTime - b.defenseTime) * sortOrder;
			if (sortKey === 'Def Score') return (a.defenseScore - b.defenseScore) * sortOrder;
			return 0;
		});

	$: filteredData = scoutingData
		.filter(row => {
			if (!searchTerm) return true;
			const team = getVal(row, 'Team #');
			if (team && team !== 'N/A') {
				return team.includes(searchTerm);
			}
			return Object.values(row).some(v => v.toLowerCase().includes(searchTerm.toLowerCase()));
		})
		.sort((a, b) => {
			const valA = getSortValue(a, sortKey);
			const valB = getSortValue(b, sortKey);
			if (valA < valB) return -1 * sortOrder;
			if (valA > valB) return 1 * sortOrder;
			return 0;
		});

	function getVal(row, partialKey) {
		if (!row) return 'N/A';
		const keys = Object.keys(row);
		const exactMatch = keys.find(k => k.toLowerCase() === partialKey.toLowerCase());
		if (exactMatch) return row[exactMatch];
		const startsWith = keys.find(k => k.toLowerCase().startsWith(partialKey.toLowerCase()));
		if (startsWith) return row[startsWith];
		const key = keys.find(k => k.toLowerCase().includes(partialKey.toLowerCase()));
		return (key && row[key]) ? row[key] : 'N/A';
	}

	function filterByTime(row) {
		if (!FILTER_TIME) return true;
		const rowTime = new Date(getVal(row, 'Timestamp')).getTime();
		const filterTime = new Date(FILTER_TIME).getTime();
		if (!isNaN(rowTime) && !isNaN(filterTime) && rowTime < filterTime) return false;
		return true;
	}

	function handleRowClick(row) {
		selectedRow = row;
		const teamNum = getVal(row, 'Team #');
		if (teamNum && teamNum !== 'N/A') {
			selectedTeamMatches = scoutingData
				.filter(r => getVal(r, 'Team #') === teamNum)
				.sort((a, b) => parseInt(getVal(a, 'Match #')) - parseInt(getVal(b, 'Match #')));
			fetchSelectedTeamDetails(teamNum);
		}
	}

	function selectTeamMatch(matchRow) {
		selectedRow = matchRow;
	}

	$: if (selectedMatchPopup) {
		fetchMatchResult(selectedMatchPopup.match_number);
	}

	function parseActions(actionStr) {
		if (!actionStr || actionStr === 'N/A') return [];
		return actionStr.split(';').map(act => {
			const [meta, time] = act.split('@');
			if (!meta || !time) return null;
			const [code, type] = meta.split(':');
			return { code, type, time: parseInt(time) };
		}).filter(Boolean).sort((a, b) => a.time - b.time);
	}

	function getGanttData(actionStr) {
		const raw = parseActions(actionStr);
		const groups = {};
		const active = {};
		raw.forEach(act => {
			if (!groups[act.code]) groups[act.code] = [];
			if (act.type === 'start') active[act.code] = act.time;
			else if (act.type === 'stop') {
				if (active[act.code] !== undefined) {
					groups[act.code].push({ start: active[act.code], end: act.time, type: 'range' });
					delete active[act.code];
				}
			} else groups[act.code].push({ time: act.time, type: 'point' });
		});
		Object.keys(active).forEach(code => groups[code].push({ start: active[code], end: 150, type: 'range' }));
		return Object.entries(groups).map(([code, events]) => ({ code, events }));
	}

	function getActionColor(code) {
		if (code.includes('score')) return 'bg-green-500';
		if (code.includes('coll') || code.includes('outpost') || code.includes('depot') || code.includes('ground')) return 'bg-blue-500';
		if (code.includes('pass')) return 'bg-orange-500';
		if (code.includes('climb')) return 'bg-purple-500';
		if (code.includes('def')) return 'bg-blue-900';
		if (code.includes('faff')) return 'bg-red-500';
		return 'bg-zinc-500';
	}

	function formatCode(code) {
		return code.replace('auto_', 'AUTO ').replace('tele_', '').replace('_', ' ').toUpperCase();
	}

	function getDriveDirectLink(url) {
		if (!url || url === 'N/A') return null;
		const idMatch = url.match(/id=([^&]+)/) || url.match(/\/d\/([^/]+)/);
		if (idMatch && idMatch[1]) return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
		return url;
	}

	function getChartData(teamNum) {
		const teamRows = scoutingData.filter(r => getVal(r, 'Team #') === teamNum).sort((a, b) => parseInt(getVal(a, 'Match #')) - parseInt(getVal(b, 'Match #')));
		return {
			labels: teamRows.map(r => `M${getVal(r, 'Match #')}`),
			datasets: [
				{ label: 'Scoring Effectiveness', data: teamRows.map(r => parseInt(getVal(r, 'Scoring effectiveness?')) || 0), borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.5)', tension: 0.3, pointBackgroundColor: '#3b82f6', pointRadius: 4 },
				{ label: 'Feeding Skill', data: teamRows.map(r => parseInt(getVal(r, 'feeding score?')) || 0), borderColor: '#fb923c', backgroundColor: 'rgba(251, 146, 60, 0.5)', tension: 0.3, pointBackgroundColor: '#fb923c', pointRadius: 4 },
				{ label: 'Defense Effectivity', data: teamRows.map(r => parseInt(getVal(r, 'defense skill')) || 0), borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.5)', tension: 0.3, pointBackgroundColor: '#ef4444', pointRadius: 4 }
			]
		};
	}

	function getTeamSummary(teamNum) {
		if (!teamNum || !teamMetrics) return null;
		const metrics = teamMetrics.find(m => m.teamNum === teamNum);
		if (!metrics) return null;
		const rows = scoutingData.filter(r => getVal(r, 'Team #') === teamNum);
		const lastEntry = rows.sort((a,b) => parseInt(getVal(b, 'Match #')) - parseInt(getVal(a, 'Match #')))[0];
		const lastComments = lastEntry ? getVal(lastEntry, 'comments') : '';
		const pit = pitData.find(p => getVal(p, 'Team number') === teamNum);
		return { ...metrics, lastComments, pit };
	}

	function getScouterCount(matchNum) {
		const teams = new Set(scoutingData.filter(r => getVal(r, 'Match #') == matchNum).map(r => getVal(r, 'Team #')));
		return teams.size;
	}

	function teamIsInMatch(teamNum, match) {
		if (!match || !match.alliances) return false;
		const allTeams = [
			...match.alliances.red.team_keys.map(k => k.replace('frc', '')),
			...match.alliances.blue.team_keys.map(k => k.replace('frc', ''))
		];
		return allTeams.includes(String(teamNum));
	}

	function getMatchBreakdown(match) {
		const scoutedTeams = new Set(scoutingData.filter(r => getVal(r, 'Match #') == match.match_number).map(r => getVal(r, 'Team #')));
		return {
			red: match.alliances.red.team_keys.map((key, i) => ({ pos: `R${i+1}`, team: key.replace('frc', ''), scouted: scoutedTeams.has(key.replace('frc', '')) })),
			blue: match.alliances.blue.team_keys.map((key, i) => ({ pos: `B${i+1}`, team: key.replace('frc', ''), scouted: scoutedTeams.has(key.replace('frc', '')) }))
		};
	}

	function loadMatchIntoSimulator(match) {
		if (!match || !match.alliances) return;
		const redTeams = match.alliances.red.team_keys.map(k => k.replace('frc', ''));
		const blueTeams = match.alliances.blue.team_keys.map(k => k.replace('frc', ''));
		simRedTeams = redTeams;
		simBlueTeams = blueTeams;
		simulatorMode = true;
		contextMenu = null;
		contextMenuMatch = null;
	}

	let hoveredMatch = null;
	let selectedMatchPopup = null;

	$: simAggregates = {
		red: {
			epa: simRedTeams.map(t => getTeamSummary(t)).filter(Boolean).reduce((acc, t) => acc + (t.epa || 0), 0),
			opr: simRedTeams.map(t => parseInt(t) || 0).reduce((acc, t) => acc + (eventOprs[`frc${t}`] || 0), 0)
		},
		blue: {
			epa: simBlueTeams.map(t => getTeamSummary(t)).filter(Boolean).reduce((acc, t) => acc + (t.epa || 0), 0),
			opr: simBlueTeams.map(t => parseInt(t) || 0).reduce((acc, t) => acc + (eventOprs[`frc${t}`] || 0), 0)
		}
	};

	$: simRpPredictions = (() => {
		function getAllianceRpDetailed(teams) {
			const details = { rp1: [], rp2: [], rp3: [] };
			let rp1Sum = 0, rp2Sum = 0, rp3Sum = 0;
			teams.forEach(t => {
				const stats = teamStatsMap.get(t);
				const v1 = stats?.rp1 || 0;
				const v2 = stats?.rp2 || 0;
				const v3 = stats?.rp3 || 0;
				rp1Sum += v1; rp2Sum += v2; rp3Sum += v3;
				details.rp1.push({ team: t, value: v1 });
				details.rp2.push({ team: t, value: v2 });
				details.rp3.push({ team: t, value: v3 });
			});
			return { sums: { rp1: rp1Sum, rp2: rp2Sum, rp3: rp3Sum }, details };
		}

		function rpState(sum) {
			if (sum > 1.0) return 'lit';
			if (sum > 0.8) return 'contention';
			return 'muted';
		}

		function rpThresholdLabel(sum) {
			if (sum > 1.0) return 'Likely (>1.0)';
			if (sum > 0.8) return 'Possible (>0.8)';
			return 'Unlikely (\u22640.8)';
		}

		function winRpState(allianceWinProb) {
			if (allianceWinProb > 0.625) return 'lit';
			if (allianceWinProb < 0.375) return 'muted';
			return 'contention';
		}

		function winThresholdLabel(prob) {
			if (prob > 0.625) return 'Likely (>62.5%)';
			if (prob < 0.375) return 'Unlikely (<37.5%)';
			return 'Toss-up';
		}

		const red = getAllianceRpDetailed(simRedTeams);
		const blue = getAllianceRpDetailed(simBlueTeams);
		const redWinProb = simWinProbs.epa;
		const blueWinProb = 1 - simWinProbs.epa;

		function buildReasons(data, winProb) {
			return {
				rp1: { teams: data.details.rp1, sum: data.sums.rp1, label: rpThresholdLabel(data.sums.rp1) },
				rp2: { teams: data.details.rp2, sum: data.sums.rp2, label: rpThresholdLabel(data.sums.rp2) },
				rp3: { teams: data.details.rp3, sum: data.sums.rp3, label: rpThresholdLabel(data.sums.rp3) },
				win: { winProb, label: winThresholdLabel(winProb) }
			};
		}

		return {
			red: {
				rp1: rpState(red.sums.rp1),
				rp2: rpState(red.sums.rp2),
				rp3: rpState(red.sums.rp3),
				win: winRpState(redWinProb),
				reasons: buildReasons(red, redWinProb)
			},
			blue: {
				rp1: rpState(blue.sums.rp1),
				rp2: rpState(blue.sums.rp2),
				rp3: rpState(blue.sums.rp3),
				win: winRpState(blueWinProb),
				reasons: buildReasons(blue, blueWinProb)
			}
		};
	})();

	$: matchPredictions = ((overrides) => schedule.map(match => {
		const redScore = match.alliances?.red?.score ?? -1;
		const blueScore = match.alliances?.blue?.score ?? -1;
		const played = redScore >= 0 && blueScore >= 0 && (redScore > 0 || blueScore > 0);

		if (played) {
			const winner = redScore > blueScore ? 'red' : blueScore > redScore ? 'blue' : 'tie';
			return { match_number: match.match_number, played: true, winner, redScore, blueScore };
		}

		const redEpa = (match.alliances?.red?.team_keys || []).reduce((sum, k) =>
			sum + (teamStatsMap.get(k.replace('frc', ''))?.epa || 0), 0);
		const blueEpa = (match.alliances?.blue?.team_keys || []).reduce((sum, k) =>
			sum + (teamStatsMap.get(k.replace('frc', ''))?.epa || 0), 0);
		const winProb = getWinProb(redEpa - blueEpa);

		let predicted;
		if (winProb > 0.625) predicted = 'red';
		else if (winProb < 0.375) predicted = 'blue';
		else predicted = 'tossup';

		// Check for user override
		const override = overrides.get(match.match_number);

		const result = { match_number: match.match_number, played: false, predicted, winProb, redEpa, blueEpa, override: override || null };
		if (override) console.log(`matchPredictions M${match.match_number}: override=${override}`, result);
		return result;
	}))(matchOverrides);

	$: predictedRankings = (() => {
		if (!eventRankings || eventRankings.length === 0) return eventRankings;

		// Build a map of team → predicted additional RP from unplayed matches
		const rpBonus = new Map();
		eventRankings.forEach(r => rpBonus.set(r.team_key, 0));

		matchPredictions.forEach(pred => {
			if (pred.played) return; // Already reflected in actual rankings

			const matchIdx = schedule.findIndex(m => m.match_number === pred.match_number);
			if (matchIdx === -1) return;
			const match = schedule[matchIdx];

			// Determine effective winner for this match
			let effectiveWinner;
			if (pred.override) {
				effectiveWinner = pred.override;
			} else if (pred.predicted === 'tossup') {
				effectiveWinner = null; // No RP bonus for toss-ups
			} else {
				effectiveWinner = pred.predicted;
			}

			if (effectiveWinner) {
				// Winner gets +2 RP, loser gets 0
				const winnerKeys = match.alliances[effectiveWinner]?.team_keys || [];
				winnerKeys.forEach(k => {
					const current = rpBonus.get(k) || 0;
					rpBonus.set(k, current + 2);
				});
			} else {
				// Toss-up: give each side +1 RP (tie equivalent)
				['red', 'blue'].forEach(alliance => {
					const keys = match.alliances[alliance]?.team_keys || [];
					keys.forEach(k => {
						const current = rpBonus.get(k) || 0;
						rpBonus.set(k, current + 1);
					});
				});
			}
		});

		// Sort by actual ranking points + predicted bonus
		return [...eventRankings].sort((a, b) => {
			const aRp = (a.sort_orders?.[0] || 0) + (rpBonus.get(a.team_key) || 0);
			const bRp = (b.sort_orders?.[0] || 0) + (rpBonus.get(b.team_key) || 0);
			return bRp - aRp;
		});
	})();

	function cycleMatchOverride(match) {
		const pred = matchPredictions.find(p => p.match_number === match.match_number);
		if (!pred || pred.played) return; // Don't override played matches

		const current = matchOverrides.get(match.match_number);
		const defaultPredicted = pred.predicted === 'tossup' ? null : pred.predicted;

		if (!current) {
			const opposite = defaultPredicted === 'red' ? 'blue' : 'red';
			matchOverrides.set(match.match_number, opposite);
			console.log(`Override M${match.match_number}: set to ${opposite}`);
		} else if (current === 'red' && defaultPredicted !== 'blue') {
			matchOverrides.set(match.match_number, 'blue');
			console.log(`Override M${match.match_number}: cycled to blue`);
		} else {
			matchOverrides.delete(match.match_number);
			console.log(`Override M${match.match_number}: cleared`);
		}
		matchOverrides = new Map(matchOverrides); // Trigger reactivity
		console.log('matchOverrides size:', matchOverrides.size, 'entries:', [...matchOverrides.entries()]);
	}

	function clearAllOverrides() {
		matchOverrides = new Map();
	}

	function cyclePlayoffOverride(matchLabel) {
		const current = playoffOverrides.get(matchLabel);
		if (!current) {
			// First override: flip to the opposite of predicted winner
			const match = bracketSimulation?.matches.find(m => m.label === matchLabel);
			if (match) {
				const predictedIsA1 = match.winner === match.a1;
				playoffOverrides.set(matchLabel, predictedIsA1 ? 'a2' : 'a1');
			}
		} else if (current === 'a1') {
			// If currently overriding to a1, try a2 (unless that's the default — then clear)
			const match = bracketSimulation?.matches.find(m => m.label === matchLabel);
			const defaultIsA2 = match && match.winner !== match.a1;
			if (defaultIsA2) {
				playoffOverrides.delete(matchLabel);
			} else {
				playoffOverrides.set(matchLabel, 'a2');
			}
		} else {
			// current === 'a2', try a1 (unless that's the default — then clear)
			const match = bracketSimulation?.matches.find(m => m.label === matchLabel);
			const defaultIsA1 = match && match.winner === match.a1;
			if (defaultIsA1) {
				playoffOverrides.delete(matchLabel);
			} else {
				playoffOverrides.set(matchLabel, 'a1');
			}
		}
		playoffOverrides = new Map(playoffOverrides);
	}

	function clearPlayoffOverrides() {
		playoffOverrides = new Map();
	}

	function formatMatchTime(unixSeconds) {
		if (!unixSeconds) return null;
		const d = new Date(unixSeconds * 1000);
		const day = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
		const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
		return `${day} ${time}`;
	}

	function getOverviewMatchPrediction(match) {
		const redTeams = (match.alliances?.red?.team_keys || []).map(k => k.replace('frc', ''));
		const blueTeams = (match.alliances?.blue?.team_keys || []).map(k => k.replace('frc', ''));
		const redEpa = redTeams.reduce((s, t) => s + (teamStatsMap.get(t)?.epa || 0), 0);
		const blueEpa = blueTeams.reduce((s, t) => s + (teamStatsMap.get(t)?.epa || 0), 0);
		const winProb = getWinProb(redEpa - blueEpa);

		const redScore = match.alliances?.red?.score ?? -1;
		const blueScore = match.alliances?.blue?.score ?? -1;
		const played = redScore >= 0 && blueScore >= 0 && (redScore > 0 || blueScore > 0);
		const winner = played ? (redScore > blueScore ? 'red' : blueScore > redScore ? 'blue' : 'tie') : null;

		function allianceRp(teams) {
			let rp1Sum = 0, rp2Sum = 0, rp3Sum = 0;
			const details = { rp1: [], rp2: [], rp3: [] };
			teams.forEach(t => {
				const stats = teamStatsMap.get(t);
				const v1 = stats?.rp1 || 0, v2 = stats?.rp2 || 0, v3 = stats?.rp3 || 0;
				rp1Sum += v1; rp2Sum += v2; rp3Sum += v3;
				details.rp1.push({ team: t, value: v1 });
				details.rp2.push({ team: t, value: v2 });
				details.rp3.push({ team: t, value: v3 });
			});
			const rpSt = (sum) => sum > 1.0 ? 'lit' : sum > 0.8 ? 'contention' : 'muted';
			const rpLbl = (sum) => sum > 1.0 ? 'Likely (>1.0)' : sum > 0.8 ? 'Possible (>0.8)' : 'Unlikely (\u22640.8)';
			return {
				rp1: rpSt(rp1Sum), rp2: rpSt(rp2Sum), rp3: rpSt(rp3Sum),
				reasons: {
					rp1: { teams: details.rp1, sum: rp1Sum, label: rpLbl(rp1Sum) },
					rp2: { teams: details.rp2, sum: rp2Sum, label: rpLbl(rp2Sum) },
					rp3: { teams: details.rp3, sum: rp3Sum, label: rpLbl(rp3Sum) },
				}
			};
		}

		const rpRed = allianceRp(redTeams);
		const rpBlue = allianceRp(blueTeams);

		if (played) {
			rpRed.win = winner === 'red' ? 'lit' : 'muted';
			rpRed.reasons.win = { winProb: winner === 'red' ? 1 : 0, label: winner === 'red' ? 'Won' : 'Lost' };
			rpBlue.win = winner === 'blue' ? 'lit' : 'muted';
			rpBlue.reasons.win = { winProb: winner === 'blue' ? 1 : 0, label: winner === 'blue' ? 'Won' : 'Lost' };
		} else {
			const winSt = (prob) => prob > 0.625 ? 'lit' : prob < 0.375 ? 'muted' : 'contention';
			const winLbl = (prob) => prob > 0.625 ? 'Likely (>62.5%)' : prob < 0.375 ? 'Unlikely (<37.5%)' : 'Toss-up';
			rpRed.win = winSt(winProb);
			rpRed.reasons.win = { winProb, label: winLbl(winProb) };
			rpBlue.win = winSt(1 - winProb);
			rpBlue.reasons.win = { winProb: 1 - winProb, label: winLbl(1 - winProb) };
		}

		return { winProb, redEpa, blueEpa, played, winner, redScore, blueScore, rpRed, rpBlue };
	}

	function getTeamWarnings(teamNum) {
		const issues = getMatchesWithIssues(teamNum);
		const cardMatches = scoutingData.filter(r => getVal(r, 'Team #') === teamNum && getVal(r, 'card') && getVal(r, 'card') !== 'No Card' && getVal(r, 'card') !== 'N/A' && getVal(r, 'card') !== '');
		const hasYellow = cardMatches.some(r => getVal(r, 'card') === 'Yellow');
		const hasRed = cardMatches.some(r => getVal(r, 'card') === 'Red');
		const cardCount = cardMatches.length;
		const diedCount = issues.filter(i => i.hasDied).length;
		const mechCount = issues.filter(i => i.hasMechanical).length;
		const tippedCount = issues.filter(i => i.hasTipped).length;
		return { cardCount, diedCount, mechCount, tippedCount, hasYellow, hasRed };
	}

	function getTeamPlayoffAllianceIndex(teamNum) {
		if (!effectiveAlliances || effectiveAlliances.length === 0) return -1;
		return effectiveAlliances.findIndex(a =>
			a.captain === teamNum || (a.picks && a.picks.includes(teamNum)) || (a.allPicks && a.allPicks.includes(teamNum))
		);
	}

	function computeEventSOS() {
		if (schedule.length === 0 || teamStatsMap.size === 0) return new Map();

		const playedMatches = schedule.filter(m => {
			const rs = m.alliances?.red?.score ?? -1;
			const bs = m.alliances?.blue?.score ?? -1;
			return rs >= 0 && bs >= 0 && (rs > 0 || bs > 0);
		});

		if (playedMatches.length === 0) return new Map();

		// Collect all teams
		const allTeams = new Set();
		schedule.forEach(m => {
			if (!m.alliances) return;
			m.alliances.red.team_keys.forEach(k => allTeams.add(k.replace('frc', '')));
			m.alliances.blue.team_keys.forEach(k => allTeams.add(k.replace('frc', '')));
		});

		// Compute average EPA across all event teams for normalization
		let totalEpa = 0, epaCount = 0;
		allTeams.forEach(t => {
			const epa = teamStatsMap.get(t)?.epa || 0;
			totalEpa += epa;
			epaCount++;
		});
		const avgEventEpa = epaCount > 0 ? totalEpa / epaCount : 0;

		// For each team, compute avg opponent EPA and avg partner EPA
		const sosRaw = new Map();
		allTeams.forEach(teamNum => {
			let oppEpaSum = 0, oppCount = 0;
			let partnerEpaSum = 0, partnerCount = 0;

			playedMatches.forEach(m => {
				const redKeys = m.alliances.red.team_keys.map(k => k.replace('frc', ''));
				const blueKeys = m.alliances.blue.team_keys.map(k => k.replace('frc', ''));
				const isRed = redKeys.includes(teamNum);
				const isBlue = blueKeys.includes(teamNum);
				if (!isRed && !isBlue) return;

				const partners = isRed ? redKeys : blueKeys;
				const opponents = isRed ? blueKeys : redKeys;

				opponents.forEach(t => {
					oppEpaSum += teamStatsMap.get(t)?.epa || 0;
					oppCount++;
				});
				partners.forEach(t => {
					if (t !== teamNum) {
						partnerEpaSum += teamStatsMap.get(t)?.epa || 0;
						partnerCount++;
					}
				});
			});

			const avgOppEpa = oppCount > 0 ? oppEpaSum / oppCount : 0;
			const avgPartnerEpa = partnerCount > 0 ? partnerEpaSum / partnerCount : 0;

			// SOS = how hard was the schedule
			// Higher opponent EPA = harder, Lower partner EPA = harder
			// Normalize: (avgOpp - eventAvg) - (avgPartner - eventAvg) = avgOpp - avgPartner
			// Then shift so positive = harder schedule
			const sosValue = (avgOppEpa - avgPartnerEpa);

			sosRaw.set(teamNum, {
				avgOppEpa,
				avgPartnerEpa,
				sosValue,
				rank: 0 // filled below
			});
		});

		// Rank by SOS (highest = hardest schedule = rank 1)
		const sorted = [...sosRaw.entries()].sort((a, b) => b[1].sosValue - a[1].sosValue);
		sorted.forEach(([team, data], idx) => {
			data.rank = idx + 1;
		});

		return sosRaw;
	}

	function getOverviewTrendData(teamNum) {
		if (!teamNum || schedule.length === 0) return null;

		// Get played matches for this team in match order
		const teamMatches = schedule
			.filter(m => teamIsInMatch(teamNum, m))
			.sort((a, b) => a.match_number - b.match_number);

		const playedMatches = teamMatches.filter(m => {
			const rs = m.alliances?.red?.score ?? -1;
			const bs = m.alliances?.blue?.score ?? -1;
			return rs >= 0 && bs >= 0 && (rs > 0 || bs > 0);
		});

		if (playedMatches.length < 2) return null;

		const labels = playedMatches.map(m => `M${m.match_number}`);

		// --- Line 1: Match Score (team's alliance score per match) ---
		const matchScores = playedMatches.map(m => {
			const isRed = m.alliances.red.team_keys.includes(`frc${teamNum}`);
			return isRed ? (m.alliances.red.score || 0) : (m.alliances.blue.score || 0);
		});

		// --- Line 2: Scout Score (scoring effectiveness per match, 0-5 scale) ---
		const scoutScores = playedMatches.map(m => {
			const row = scoutingData.find(r => getVal(r, 'Team #') === teamNum && getVal(r, 'Match #') == m.match_number);
			return row ? (parseFloat(getVal(row, 'Scoring effectiveness?')) || 0) : null;
		});

		// --- Line 3: Rank Over Time (computed from cumulative RP for ALL teams) ---
		const playedSchedule = schedule.filter(m => {
			const rs = m.alliances?.red?.score ?? -1;
			const bs = m.alliances?.blue?.score ?? -1;
			return rs >= 0 && bs >= 0 && (rs > 0 || bs > 0);
		}).sort((a, b) => a.match_number - b.match_number);

		// Track cumulative RP for all teams
		const teamRPs = new Map();
		const teamWins = new Map();
		const allTeams = new Set();
		schedule.forEach(m => {
			if (!m.alliances) return;
			m.alliances.red.team_keys.forEach(k => allTeams.add(k.replace('frc', '')));
			m.alliances.blue.team_keys.forEach(k => allTeams.add(k.replace('frc', '')));
		});
		allTeams.forEach(t => { teamRPs.set(t, 0); teamWins.set(t, 0); });

		// Build rank snapshots at each match the focused team played
		const rankOverTime = [];
		let nextTeamMatchIdx = 0;
		const teamPlayedNums = new Set(playedMatches.map(m => m.match_number));

		playedSchedule.forEach(m => {
			const rs = m.alliances.red.score || 0;
			const bs = m.alliances.blue.score || 0;
			const redWon = rs > bs;
			const blueWon = bs > rs;

			// Award 2 RP for win, 1 for tie
			m.alliances.red.team_keys.forEach(k => {
				const t = k.replace('frc', '');
				teamRPs.set(t, (teamRPs.get(t) || 0) + (redWon ? 2 : blueWon ? 0 : 1));
				if (redWon) teamWins.set(t, (teamWins.get(t) || 0) + 1);
			});
			m.alliances.blue.team_keys.forEach(k => {
				const t = k.replace('frc', '');
				teamRPs.set(t, (teamRPs.get(t) || 0) + (blueWon ? 2 : redWon ? 0 : 1));
				if (blueWon) teamWins.set(t, (teamWins.get(t) || 0) + 1);
			});

			// If this is a match our team played, snapshot the rank
			if (teamPlayedNums.has(m.match_number)) {
				// Sort all teams by RP desc, then wins desc
				const sorted = [...allTeams].sort((a, b) => {
					const rpDiff = (teamRPs.get(b) || 0) - (teamRPs.get(a) || 0);
					if (rpDiff !== 0) return rpDiff;
					return (teamWins.get(b) || 0) - (teamWins.get(a) || 0);
				});
				const rank = sorted.indexOf(teamNum) + 1;
				rankOverTime.push(rank);
			}
		});

		// Determine scales
		const maxScore = Math.max(...matchScores, 100);
		const maxRank = allTeams.size;

		return {
			labels,
			datasets: [
				{
					label: 'Alliance Score',
					data: matchScores,
					borderColor: '#8b5cf6',
					backgroundColor: 'rgba(139, 92, 246, 0.1)',
					tension: 0.3,
					pointBackgroundColor: '#8b5cf6',
					pointRadius: 3,
					borderWidth: 2,
					yAxisID: 'yScore'
				},
				{
					label: 'Scout Score (0-5)',
					data: scoutScores,
					borderColor: '#3b82f6',
					backgroundColor: 'rgba(59, 130, 246, 0.1)',
					tension: 0.3,
					pointBackgroundColor: '#3b82f6',
					pointRadius: 3,
					borderWidth: 2,
					spanGaps: true,
					yAxisID: 'yScout'
				},
				{
					label: 'Event Rank',
					data: rankOverTime,
					borderColor: '#f59e0b',
					backgroundColor: 'rgba(245, 158, 11, 0.1)',
					tension: 0.3,
					pointBackgroundColor: '#f59e0b',
					pointRadius: 3,
					borderWidth: 2,
					borderDash: [4, 4],
					yAxisID: 'yRank'
				}
			],
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: { mode: 'index', intersect: false },
				scales: {
					yScore: {
						type: 'linear',
						position: 'left',
						min: 0,
						max: Math.ceil(maxScore / 50) * 50,
						ticks: { color: '#8b5cf6', font: { weight: 'bold', size: 8 } },
						grid: { color: '#18181b' },
						title: { display: true, text: 'Score', color: '#8b5cf6', font: { size: 8, weight: 'bold' } }
					},
					yScout: {
						type: 'linear',
						position: 'right',
						min: 0,
						max: 5,
						ticks: { color: '#3b82f6', font: { weight: 'bold', size: 8 } },
						grid: { display: false },
						title: { display: true, text: 'Scout', color: '#3b82f6', font: { size: 8, weight: 'bold' } }
					},
					yRank: {
						type: 'linear',
						position: 'right',
						min: 1,
						max: maxRank,
						reverse: true,
						ticks: { color: '#f59e0b', font: { weight: 'bold', size: 8 }, stepSize: Math.ceil(maxRank / 5) },
						grid: { display: false },
						title: { display: true, text: 'Rank', color: '#f59e0b', font: { size: 8, weight: 'bold' } }
					},
					x: {
						ticks: { color: '#3f3f46', font: { weight: 'bold', size: 8 } },
						grid: { display: false }
					}
				},
				plugins: {
					legend: {
						position: 'top',
						align: 'end',
						labels: { color: '#71717a', font: { weight: 'bold', size: 8 }, usePointStyle: true, padding: 10 }
					},
					tooltip: {
						callbacks: {
							label: (ctx) => {
								const val = ctx.parsed.y;
								if (ctx.dataset.label === 'Event Rank') return `Rank: #${val}`;
								if (ctx.dataset.label === 'Scout Score (0-5)') return `Scout: ${val?.toFixed(1) ?? '—'}/5`;
								return `Score: ${val}`;
							}
						}
					}
				}
			}
		};
	}

	function enterDebugMode(mode) {
		debugMode = mode;
		localStorage.removeItem('scouting_cache');
		matchOverrides = new Map();
		playoffOverrides = new Map();
		quickLinksOpen = false;
		fetchData(true);
	}

	function exitDebugMode() {
		debugMode = null;
		localStorage.removeItem('scouting_cache');
		matchOverrides = new Map();
		playoffOverrides = new Map();
		fetchData(true);
	}

	function openOverrideMenu(e, label, type) {
		e.preventDefault();
		overrideContextMenu = { x: e.clientX, y: e.clientY };
		overrideContextMenuLabel = label;
		overrideContextMenuType = type;
		if (type === 'playoff' && bracketSimulation) {
			const match = bracketSimulation.matches.find(m => m.label === label);
			if (match) {
				const a1Num = effectiveAlliances.indexOf(match.a1) + 1;
				const a2Num = effectiveAlliances.indexOf(match.a2) + 1;
				overrideContextMenuRedLabel = `Override Alliance ${a1Num}`;
				overrideContextMenuBlueLabel = `Override Alliance ${a2Num}`;
			}
		} else {
			overrideContextMenuRedLabel = 'Override Red';
			overrideContextMenuBlueLabel = 'Override Blue';
		}
	}

	function handleOverrideRed() {
		if (overrideContextMenuType === 'quals') {
			const matchNum = parseInt(overrideContextMenuLabel.replace('Match ', ''));
			matchOverrides.set(matchNum, 'red');
			matchOverrides = new Map(matchOverrides);
		} else if (overrideContextMenuType === 'playoff') {
			playoffOverrides.set(overrideContextMenuLabel, 'a1');
			playoffOverrides = new Map(playoffOverrides);
		}
	}

	function handleOverrideBlue() {
		if (overrideContextMenuType === 'quals') {
			const matchNum = parseInt(overrideContextMenuLabel.replace('Match ', ''));
			matchOverrides.set(matchNum, 'blue');
			matchOverrides = new Map(matchOverrides);
		} else if (overrideContextMenuType === 'playoff') {
			playoffOverrides.set(overrideContextMenuLabel, 'a2');
			playoffOverrides = new Map(playoffOverrides);
		}
	}

	function handleClearSingleOverride() {
		if (overrideContextMenuType === 'quals') {
			const matchNum = parseInt(overrideContextMenuLabel.replace('Match ', ''));
			matchOverrides.delete(matchNum);
			matchOverrides = new Map(matchOverrides);
		} else if (overrideContextMenuType === 'playoff') {
			playoffOverrides.delete(overrideContextMenuLabel);
			playoffOverrides = new Map(playoffOverrides);
		}
	}

	function loadPlayoffMatchIntoSim(match) {
		if (!match.a1 || !match.a2) return;
		simRedTeams = [match.a1.captain, ...(match.a1.picks || [])].slice(0, 3);
		simBlueTeams = [match.a2.captain, ...(match.a2.picks || [])].slice(0, 3);
		simulatorMode = true;
		selectionMode = false;
		pitMode = false;
		defenseMode = false;
	}

	function hasMatchIssues(scoutRow) {
		const comments = (getVal(scoutRow, 'comments') || '').toLowerCase();
		const hasMechanical = comments.includes('mechanical') || comments.includes('broke') || comments.includes('died');
		const hasFouls = comments.includes('card') || comments.includes('yellow') || comments.includes('red');
		const hasStability = comments.includes('tipped') || comments.includes('tip') || comments.includes('unstable');
		return hasMechanical || hasFouls || hasStability;
	}

	function getTeamRoleRecommendation(teamNum) {
		const summary = getTeamSummary(teamNum);
		if (!summary) return null;

		const teamRows = scoutingData.filter(r => getVal(r, 'Team #') === teamNum);
		const avgEpa = summary.epa;
		const avgEff = summary.avgEff;

		// Filter out matches with issues for effectiveness calculation
		const cleanRows = teamRows.filter(r => !hasMatchIssues(r));
		const denominator = cleanRows.length || 1;

		// Calculate role-specific effectiveness metrics (excluding matches with issues)
		const scoringEff = cleanRows.reduce((acc, r) => acc + (parseFloat(getVal(r, 'Scoring effectiveness?')) || 0), 0) / denominator;
		const passingEff = cleanRows.reduce((acc, r) => acc + (parseFloat(getVal(r, 'feeding score?')) || 0), 0) / denominator;
		const defendingEff = cleanRows.reduce((acc, r) => acc + (parseFloat(getVal(r, 'defense skill')) || 0), 0) / denominator;

		const issues = [];

		// Analyze match comments for patterns
		const allComments = teamRows.map(r => (getVal(r, 'comments') || '').toLowerCase()).join(' ');

		// Detect issues
		if (allComments.includes('mechanical') || allComments.includes('broke') || allComments.includes('died')) {
			issues.push('mechanical');
		}
		if (allComments.includes('card') || allComments.includes('yellow') || allComments.includes('red')) {
			issues.push('fouls');
		}
		if (allComments.includes('tipped') || allComments.includes('tip') || allComments.includes('unstable')) {
			issues.push('stability');
		}

		// Determine role based on effectiveness metrics combined with EPA
		let role = 'Passing';
		let recommendation = 'Focus on consistent piece feeding';
		let roleScore = 0;

		// Score each role
		const scorerScore = scoringEff * 2.0 + (avgEpa / 50); // Weight scoring efficiency heavily
		const passingScore = passingEff * 1.5 + (avgEpa / 100); // Passing is important but secondary
		const defendingScore = defendingEff * 2.0; // Defending is pure effectiveness

		if (defendingScore > scorerScore && defendingScore > passingScore && defendingEff >= 2) {
			role = 'Defending';
			recommendation = `Leverage defensive strength (${defendingEff.toFixed(1)}/5) to disrupt opponent offense`;
		} else if (scorerScore > passingScore && scoringEff >= 2) {
			role = 'Scoring';
			recommendation = `Maximize scoring efficiency (${scoringEff.toFixed(1)}/5) with EPA focus`;
		} else if (passingEff >= 2.5) {
			role = 'Passing';
			recommendation = `Drive consistent piece feeding (${passingEff.toFixed(1)}/5) to enable scoring`;
		} else {
			role = 'Passing';
			recommendation = 'Focus on consistent piece feeding';
		}

		return {
			teamNum,
			role,
			recommendation,
			stats: {
				epa: avgEpa,
				avgEff: avgEff,
				scoringEff,
				passingEff,
				defendingEff,
				matchCount: teamRows.length
			},
			issues
		};
	}

	function getAllianceStrategy(teams) {
		const recommendations = teams
			.map(t => getTeamRoleRecommendation(t))
			.filter(Boolean);

		if (recommendations.length === 0) return null;

		// Sort by role priority
		const roleOrder = { 'Scoring': 0, 'Passing': 1, 'Defending': 2 };
		recommendations.sort((a, b) => (roleOrder[a.role] || 999) - (roleOrder[b.role] || 999));

		const avgEpa = recommendations.reduce((acc, r) => acc + r.stats.epa, 0) / recommendations.length;

		return {
			recommendations,
			avgEpa,
			strategy: generateStrategy(recommendations)
		};
	}

	function generateStrategy(recommendations) {
		const scorers = recommendations.filter(r => r.role === 'Scoring').length;
		const passers = recommendations.filter(r => r.role === 'Passing').length;
		const defenders = recommendations.filter(r => r.role === 'Defending').length;

		let strategy = '';
		if (scorers >= 2 && passers >= 1) {
			strategy = 'Strong scoring pipeline with multiple feeders';
		} else if (scorers >= 2) {
			strategy = 'Dual scoring focus with balanced support';
		} else if (defenders >= 2) {
			strategy = 'Defensive-focused; disrupt opponent offense';
		} else if (passers >= 2) {
			strategy = 'Emphasize feeding efficiency for consistent scoring';
		} else {
			strategy = 'Balanced approach; focus on consistency';
		}

		return strategy;
	}

	function getMatchScoutingData(matchNumber) {
		const scoutedTeams = scoutingData.filter(r => getVal(r, 'Match #') == matchNumber);
		const breakdown = schedule.find(m => m.match_number === matchNumber);
		if (!breakdown) return { red: [], blue: [], videos: [], ganttData: [] };

		const red = breakdown.alliances.red.team_keys.map(key => {
			const team = key.replace('frc', '');
			const scout = scoutedTeams.find(r => getVal(r, 'Team #') === team);
			return { team, scout };
		});
		const blue = breakdown.alliances.blue.team_keys.map(key => {
			const team = key.replace('frc', '');
			const scout = scoutedTeams.find(r => getVal(r, 'Team #') === team);
			return { team, scout };
		});

		// Extract YouTube videos if available
		const videos = [];
		if (breakdown.videos && Array.isArray(breakdown.videos)) {
			breakdown.videos.forEach(video => {
				if (video.type === 'youtube' && video.key) {
					videos.push({
						key: video.key,
						type: video.type,
						url: `https://www.youtube.com/embed/${video.key}`
					});
				}
			});
		}

		// Build Gantt chart data from all teams' actions
		const ganttData = [];
		[...red, ...blue].forEach(({ team, scout }) => {
			if (scout) {
				const actionStr = getVal(scout, 'actions');
				const ganttGroups = getGanttData(actionStr);
				ganttGroups.forEach(group => {
					group.events.forEach(event => {
						if (event.type === 'range') {
							ganttData.push({
								team,
								code: group.code,
								start: event.start,
								end: event.end,
								alliance: red.some(r => r.team === team) ? 'red' : 'blue'
							});
						}
					});
				});
			}
		});

		return { red, blue, videos, ganttData };
	}

	function getMatchesWithIssues(teamNum) {
		const matches = scoutingData
			.filter(r => getVal(r, 'Team #') === teamNum)
			.filter(r => {
				const hasMechanical = getVal(r, 'mech issue') === 'TRUE' || getVal(r, 'mechanical issue') === 'Yes';
				const hasTipped = getVal(r, 'tipped') === 'TRUE' || getVal(r, 'tipped') === 'Yes';
				const hasDied = getVal(r, 'died') === 'TRUE' || getVal(r, 'died') === 'Yes';
				const hasCard = getVal(r, 'card') !== 'No Card' && getVal(r, 'card') !== 'N/A' && getVal(r, 'card') !== '';
				return hasMechanical || hasTipped || hasDied || hasCard;
			})
			.map(r => ({
				matchNum: getVal(r, 'Match #'),
				hasMechanical: getVal(r, 'mech issue') === 'TRUE' || getVal(r, 'mechanical issue') === 'Yes',
				hasTipped: getVal(r, 'tipped') === 'TRUE' || getVal(r, 'tipped') === 'Yes',
				hasDied: getVal(r, 'died') === 'TRUE' || getVal(r, 'died') === 'Yes',
				hasCard: getVal(r, 'card') !== 'No Card' && getVal(r, 'card') !== 'N/A' && getVal(r, 'card') !== ''
			}));
		return matches;
	}

	function getTeamMatchData(teamNum, matchNum) {
		return scoutingData.find(r => getVal(r, 'Team #') === teamNum && getVal(r, 'Match #') == matchNum);
	}

	function getTeamMatchIssues(teamNum, matchNum) {
		const match = getTeamMatchData(teamNum, matchNum);
		if (!match) return null;
		const hasMechanical = getVal(match, 'mech issue') === 'TRUE' || getVal(match, 'mechanical issue') === 'Yes';
		const hasTipped = getVal(match, 'tipped') === 'TRUE' || getVal(match, 'tipped') === 'Yes';
		const hasDied = getVal(match, 'died') === 'TRUE' || getVal(match, 'died') === 'Yes';
		const hasCard = getVal(match, 'card') !== 'No Card' && getVal(match, 'card') !== 'N/A' && getVal(match, 'card') !== '';
		return { hasMechanical, hasTipped, hasDied, hasCard };
	}

	function getMatchResult(matchNumber) {
		// Check cache first
		if (matchResultsMap.has(matchNumber)) {
			return matchResultsMap.get(matchNumber);
		}

		const match = schedule.find(m => m.match_number === matchNumber);
		if (!match) return null;
		
		// Check if match has score data from TBA
		if (match.alliances && match.alliances.red && match.alliances.blue) {
			const red = match.alliances.red.score || 0;
			const blue = match.alliances.blue.score || 0;
			if (red > 0 || blue > 0) {
				const result = { 
					red, 
					blue, 
					winner: red > blue ? 'red' : (blue > red ? 'blue' : 'tie'),
					source: 'official'
				};
				matchResultsMap.set(matchNumber, result);
				return result;
			}
		}
		
		// Match likely hasn't been played yet
		return null;
	}

	async function fetchMatchResult(matchNumber) {
		// Check cache first
		if (matchResultsMap.has(matchNumber)) {
			return matchResultsMap.get(matchNumber);
		}

		try {
			const eventKey = EVENT_KEY;
			const res = await fetch(`https://api.statbotics.io/v3/match/${eventKey}_qm${matchNumber}`);
			if (res.ok) {
				const data = await res.json();
				if (data && data.result) {
					const result = {
						red: data.result.red_score || 0,
						blue: data.result.blue_score || 0,
						winner: data.result.winner === 'R' ? 'red' : data.result.winner === 'B' ? 'blue' : 'tie',
						source: 'statbotics'
					};
					matchResultsMap.set(matchNumber, result);
					return result;
				}
			}
		} catch (e) {
			console.error(`Error fetching match result for match ${matchNumber}:`, e);
		}

		// Fall back to TBA data
		return getMatchResult(matchNumber);
	}

	function getMatchPrediction(matchNumber) {
		const match = schedule.find(m => m.match_number === matchNumber);
		if (!match) return null;
		const redTeams = match.alliances.red.team_keys.map(k => k.replace('frc', ''));
		const blueTeams = match.alliances.blue.team_keys.map(k => k.replace('frc', ''));
		const redScore = redTeams.reduce((sum, team) => sum + (teamStatsMap.get(team)?.epa || 0), 0);
		const blueScore = blueTeams.reduce((sum, team) => sum + (teamStatsMap.get(team)?.epa || 0), 0);
		return {
			red: redScore,
			blue: blueScore,
			winner: redScore > blueScore ? 'red' : blueScore > redScore ? 'blue' : 'tie'
		};
	}

	function hasMatchScoutedData(matchNumber) {
		return scoutingData.some(r => getVal(r, 'Match #') == matchNumber);
	}

	function getMatchScoutedBreakdown(matchNumber) {
		const scoutedTeams = scoutingData.filter(r => getVal(r, 'Match #') == matchNumber);
		if (scoutedTeams.length === 0) return null;

		const breakdown = schedule.find(m => m.match_number === matchNumber);
		if (!breakdown) return null;

		const redTeams = breakdown.alliances.red.team_keys.map(k => k.replace('frc', ''));
		const blueTeams = breakdown.alliances.blue.team_keys.map(k => k.replace('frc', ''));

		const calculateTeamScore = (teamNum) => {
			const scout = scoutedTeams.find(r => getVal(r, 'Team #') === teamNum);
			if (!scout) return 0;
			const scoring = parseFloat(getVal(scout, 'Scoring effectiveness?')) || 0;
			const feeding = parseFloat(getVal(scout, 'feeding score?')) || 0;
			return (scoring + feeding) / 2;
		};

		const redScore = redTeams.reduce((sum, team) => sum + calculateTeamScore(team), 0);
		const blueScore = blueTeams.reduce((sum, team) => sum + calculateTeamScore(team), 0);

		return {
			red: redScore,
			blue: blueScore,
			winner: redScore > blueScore ? 'red' : blueScore > redScore ? 'blue' : 'tie',
			scoutedCount: scoutedTeams.length
		};
	}
</script>

<svelte:head>
	<title>Scouting Dashboard - REBUILT 2026</title>
	<meta name="description" content="Scouting view for 1757 - REBUILT 2026" />
</svelte:head>

<Navbar />

<!-- Loading Overlay -->
{#if loading}
	<div class="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 backdrop-blur-lg animate-in fade-in duration-300">
		<div class="flex flex-col items-center gap-6 max-w-md px-6">
			<!-- Logo/Icon -->
			<div class="flex flex-col items-center gap-4">
				<div class="relative w-16 h-16">
					<div class="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
					<div class="absolute inset-1.5 border-4 border-transparent border-b-orange-500 rounded-full animate-spin" style="animation-direction: reverse;"></div>
				</div>
				<h2 class="text-2xl font-black text-white uppercase tracking-tighter">Initializing</h2>
			</div>

			<!-- Progress Steps -->
			<div class="w-full space-y-2">
				<div class="flex items-center gap-3 p-3 rounded-lg {loadingSteps.scoutingData || !scoutingData.length ? 'bg-blue-600/20 border-2 border-blue-500/50' : 'bg-zinc-900/40 border border-zinc-800'}">
					<div class="flex-shrink-0">
						{#if loadingSteps.scoutingData}
							<div class="w-5 h-5 border-2 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
						{:else if scoutingData.length}
							<svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
						{:else}
							<svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
						{/if}
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-black text-white uppercase tracking-widest">Scouting Data</p>
						<p class="text-xs text-zinc-400">{scoutingData.length} entries loaded</p>
					</div>
				</div>

				<div class="flex items-center gap-3 p-3 rounded-lg {loadingSteps.pitData || !pitData.length ? 'bg-blue-600/20 border-2 border-blue-500/50' : 'bg-zinc-900/40 border border-zinc-800'}">
					<div class="flex-shrink-0">
						{#if loadingSteps.pitData}
							<div class="w-5 h-5 border-2 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
						{:else if pitData.length}
							<svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
						{:else}
							<svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
						{/if}
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-black text-white uppercase tracking-widest">Pit Data</p>
						<p class="text-xs text-zinc-400">{pitData.length} teams scouted</p>
					</div>
				</div>

				<div class="flex items-center gap-3 p-3 rounded-lg {loadingSteps.eventStats || !schedule.length ? 'bg-blue-600/20 border-2 border-blue-500/50' : 'bg-zinc-900/40 border border-zinc-800'}">
					<div class="flex-shrink-0">
						{#if loadingSteps.eventStats}
							<div class="w-5 h-5 border-2 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
						{:else if schedule.length}
							<svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
						{:else}
							<svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
						{/if}
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-black text-white uppercase tracking-widest">Event Stats (TBA)</p>
						<p class="text-xs text-zinc-400">OPR</p>
					</div>
				</div>

				<div class="flex items-center gap-3 p-3 rounded-lg {loadingSteps.schedule ? 'bg-blue-600/20 border-2 border-blue-500/50' : 'bg-zinc-900/40 border border-zinc-800'}">
					<div class="flex-shrink-0">
						{#if loadingSteps.schedule}
							<div class="w-5 h-5 border-2 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
						{:else if schedule.length}
							<svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
						{:else}
							<svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
						{/if}
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-black text-white uppercase tracking-widest">Match Schedule</p>
						<p class="text-xs text-zinc-400">{schedule.length} matches</p>
					</div>
				</div>

				<div class="flex items-center gap-3 p-3 rounded-lg {loadingSteps.eventTeams ? 'bg-blue-600/20 border-2 border-blue-500/50' : 'bg-zinc-900/40 border border-zinc-800'}">
					<div class="flex-shrink-0">
						{#if loadingSteps.eventTeams}
							<div class="w-5 h-5 border-2 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
						{:else if eventTeams.length}
							<svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
						{:else}
							<svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
						{/if}
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-black text-white uppercase tracking-widest">Event Teams</p>
						<p class="text-xs text-zinc-400">{eventTeams.length} teams registered</p>
					</div>
				</div>

				<div class="flex items-center gap-3 p-3 rounded-lg {loadingSteps.teamStats || !teamStatsMap.size ? 'bg-blue-600/20 border-2 border-blue-500/50' : 'bg-zinc-900/40 border border-zinc-800'}">
					<div class="flex-shrink-0">
						{#if loadingSteps.teamStats}
							<div class="w-5 h-5 border-2 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
						{:else if teamStatsMap.size}
							<svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
						{:else}
							<svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
						{/if}
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-black text-white uppercase tracking-widest">Team Analytics</p>
            <p class="text-xs text-zinc-400">Powered by Statbotics</p>
						<p class="text-xs text-zinc-400">{teamStatsMap.size} teams indexed</p>
					</div>
				</div>

				<div class="flex items-center gap-3 p-3 rounded-lg {loadingSteps.teamColors || !teamColorsMap.size ? 'bg-blue-600/20 border-2 border-blue-500/50' : 'bg-zinc-900/40 border border-zinc-800'}">
					<div class="flex-shrink-0">
						{#if loadingSteps.teamColors}
							<div class="w-5 h-5 border-2 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
						{:else if teamColorsMap.size}
							<svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
						{:else}
							<svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
						{/if}
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-black text-white uppercase tracking-widest">Team Visuals</p>
						<p class="text-xs text-zinc-400">{teamColorsMap.size} brand colors loaded</p>
					</div>
				</div>

				<div class="flex items-center gap-3 p-3 rounded-lg {loadingSteps.teamDetails || !teamDetailsMap.size ? 'bg-blue-600/20 border-2 border-blue-500/50' : 'bg-zinc-900/40 border border-zinc-800'}">
					<div class="flex-shrink-0">
						{#if loadingSteps.teamDetails}
							<div class="w-5 h-5 border-2 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
						{:else if teamDetailsMap.size}
							<svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
						{:else}
							<svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
						{/if}
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-black text-white uppercase tracking-widest">Team Identities (TBA)</p>
						<p class="text-xs text-zinc-400">{teamDetailsMap.size} profiles indexed</p>
					</div>
				</div>
			</div>

			<!-- Loading Message -->
			<div class="text-center relative group cursor-help">
				<p class="text-xs font-black text-zinc-500 uppercase tracking-widest animate-pulse transition-all duration-500 min-h-[1rem]">
					{funMessages[currentMessageIndex]}
				</p>
				
				<!-- Fun Messages Menu (Tooltip) -->
				<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-6 w-72 bg-zinc-900/95 backdrop-blur-xl border-2 border-zinc-800 rounded-2xl p-5 shadow-[0_0_50px_rgba(0,0,0,0.5)] opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none group-hover:translate-y-[-10px] z-[200]">
					<div class="flex items-center justify-between mb-4 border-b border-zinc-800 pb-2">
						<p class="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Background Tasks</p>
						<span class="text-[8px] font-black text-zinc-600 uppercase bg-zinc-800 px-2 py-0.5 rounded-full">{funMessages.length} Ops</span>
					</div>
					<div class="space-y-2.5 max-h-60 overflow-y-auto pr-2 custom-scrollbar text-left">
						{#each funMessages as msg, i}
							<div class="flex items-center gap-3 transition-colors duration-300 {i === currentMessageIndex ? 'text-white' : 'text-zinc-600'}">
								<div class="flex-shrink-0 w-1.5 h-1.5 rounded-full {i === currentMessageIndex ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] animate-pulse' : 'bg-zinc-800'}"></div>
								<p class="text-[10px] font-bold uppercase tracking-tight {i === currentMessageIndex ? 'translate-x-1' : ''} transition-transform duration-300">{msg}</p>
							</div>
						{/each}
					</div>
					<div class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-zinc-900 border-r-2 border-b-2 border-zinc-800 rotate-45"></div>
				</div>
			</div>
		</div>
	</div>
{/if}

<div class="min-h-screen bg-[#050505] text-white p-4 font-sans">
	<div class="container mx-auto">
		<div class="flex flex-col gap-4 mb-8">
			<!-- Title Row -->
			<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<h1 class="text-3xl sm:text-4xl font-black text-blue-500 uppercase tracking-tighter shadow-blue-500/20 drop-shadow-lg">Scouting Dashboard</h1>
				<div class="flex items-center gap-2 w-full sm:w-auto">
					<div class="relative flex-1 sm:w-64">
						<input type="text" bind:value={searchTerm} placeholder="Search Team #..." class="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 px-5 focus:ring-2 focus:ring-blue-500 outline-none transition text-sm placeholder:text-zinc-600 font-bold" />
					</div>
					<button on:click={() => fetchData(true)} class="bg-zinc-900 hover:bg-zinc-800 p-3 px-4 sm:px-6 rounded-xl font-black text-xs transition border border-zinc-800 shadow-lg active:scale-95 text-blue-500 whitespace-nowrap">REFRESH</button>
				</div>
			</div>
			
			<!-- Mode Buttons Row -->
			<div class="flex flex-wrap gap-2">
				<button on:click={() => { pitMode = !pitMode; if(pitMode) { simulatorMode = false; selectionMode = false; defenseMode = false; } }} class="px-3 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition border-2 whitespace-nowrap {pitMode ? 'bg-zinc-100 border-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white'}">
					<span class="hidden sm:inline">No Statistics</span>
					<span class="sm:hidden">Pit</span>
				</button>
				<button on:click={() => { simulatorMode = !simulatorMode; if(simulatorMode) { selectionMode = false; pitMode = false; defenseMode = false; } }} class="px-3 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition border-2 whitespace-nowrap {simulatorMode ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white'}">Simulator</button>
				<button on:click={() => { selectionMode = !selectionMode; if(selectionMode) { simulatorMode = false; pitMode = false; defenseMode = false; } }} class="px-3 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition border-2 whitespace-nowrap {selectionMode ? 'bg-orange-600 border-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white'}">
					<span class="hidden sm:inline">Selection Mode</span>
					<span class="sm:hidden">Selection</span>
				</button>
				<button on:click={() => { defenseMode = !defenseMode; if(defenseMode) { simulatorMode = false; pitMode = false; selectionMode = false; overviewMode = false; scoutLeadMode = false; } }} class="px-3 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition border-2 whitespace-nowrap {defenseMode ? 'bg-red-600 border-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white'}">Defense</button>
				<button on:click={() => { overviewMode = !overviewMode; if(overviewMode) { simulatorMode = false; pitMode = false; selectionMode = false; defenseMode = false; scoutLeadMode = false; if(!overviewTeam && searchTerm) overviewTeam = searchTerm; } }} class="px-3 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition border-2 whitespace-nowrap {overviewMode ? 'bg-purple-600 border-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white'}">Overview</button>
				<button on:click={() => { scoutLeadMode = !scoutLeadMode; if(scoutLeadMode) { simulatorMode = false; pitMode = false; selectionMode = false; defenseMode = false; overviewMode = false; } }} class="px-3 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition border-2 whitespace-nowrap {scoutLeadMode ? 'bg-yellow-600 border-yellow-500 text-white shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white'}">Scout Lead</button>
				<button on:click={() => { pitMode = false; simulatorMode = false; selectionMode = false; defenseMode = false; overviewMode = false; scoutLeadMode = false; }} class="px-3 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition border-2 whitespace-nowrap {!pitMode && !simulatorMode && !selectionMode && !defenseMode && !overviewMode && !scoutLeadMode ? 'bg-green-600 border-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.4)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white'}">
					<span class="hidden sm:inline">All Data</span>
					<span class="sm:hidden">All</span>
				</button>
        <div class="relative ml-auto">
          <button on:click={() => { quickLinksOpen = !quickLinksOpen; }} class="px-3 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition border-2 border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 {quickLinksOpen ? 'bg-zinc-800 text-white border-zinc-600' : ''}">
            Quick Links
          </button>
          {#if quickLinksOpen}
            <div class="absolute top-full mt-2 right-0 bg-zinc-900 border-2 border-zinc-700 rounded-lg shadow-lg z-50 min-w-max">
              {#if PIT_SCOUTING_FORM_URL}
                <a href={PIT_SCOUTING_FORM_URL} target="_blank" rel="noopener noreferrer" class="block px-4 py-2 text-sm text-zinc-100 hover:bg-zinc-800 hover:text-white first:rounded-t-lg transition">
                  Pit Scouting Form
                </a>
              {/if}
              <a href="/scouting" target="_blank" rel="noopener noreferrer" class="block px-4 py-2 text-sm text-zinc-100 hover:bg-zinc-800 hover:text-white transition">
                Scouting Form
              </a>
              <a href="/scouting-assignments" class="block px-4 py-2 text-sm text-zinc-100 hover:bg-zinc-800 hover:text-white transition">
                Scouting Assignments
              </a>
              <a href="https://www.thebluealliance.com/event/{EVENT_KEY}" target="_blank" rel="noopener noreferrer" class="block px-4 py-2 text-sm text-zinc-100 hover:bg-zinc-800 hover:text-white transition">
                TBA Event
              </a>
              <a href="https://www.statbotics.io/event/{EVENT_KEY}" target="_blank" rel="noopener noreferrer" class="block px-4 py-2 text-sm text-zinc-100 hover:bg-zinc-800 hover:text-white transition">
                Statbotics
              </a>
              <div class="border-t border-zinc-700 my-1"></div>
              <button on:click={() => enterDebugMode('quals')} class="w-full text-left block px-4 py-2 text-sm font-bold transition {debugMode === 'quals' ? 'text-yellow-300 bg-yellow-500/20' : 'text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-300'}">
                🧪 Debug — Quals
              </button>
              <button on:click={() => enterDebugMode('playoffs')} class="w-full text-left block px-4 py-2 text-sm font-bold transition {debugMode === 'playoffs' ? 'text-yellow-300 bg-yellow-500/20' : 'text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-300'}">
                🧪 Debug — Playoffs
              </button>
              {#if debugMode}
                <button on:click={() => { exitDebugMode(); quickLinksOpen = false; }} class="w-full text-left block px-4 py-2 text-sm font-bold text-green-400 hover:bg-green-500/10 hover:text-green-300 rounded-b-lg transition">
                  🟢 Run Live Dashboard
                </button>
              {/if}
            </div>
          {/if}
        </div>
        <button on:click={toggleFullscreen} class="px-3 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition border-2 border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700" title="Toggle fullscreen">
          {isFullscreen ? '⛌' : '⛶'}
        </button>
				{#if simulatorMode}
					<button on:click={clearSimulator} class="px-3 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition border-2 border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white shadow-[0_0_15px_rgba(239,68,68,0.2)] ml-auto">
						Clear All
					</button>
				{/if}
			</div>
		</div>

		{#if debugMode}
			<div class="mb-4 px-4 py-3 rounded-xl border-2 border-yellow-500/50 bg-yellow-500/10 flex items-center justify-between gap-3 flex-wrap">
				<div class="flex items-center gap-2">
					<span class="text-yellow-400 text-lg">⚠️</span>
					<p class="text-sm font-black text-yellow-300 uppercase tracking-wide">
						Debug Mode — Displaying test data ({debugMode === 'playoffs' ? 'Quals + Playoffs' : 'Quals only'})
					</p>
				</div>
				<button
					on:click={exitDebugMode}
					class="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 transition-colors"
				>
					Return to Live Dashboard
				</button>
			</div>
		{/if}

		<!-- Match Coverage Map -->
		<CoverageMap
			{schedule}
			{hoveredMatch}
			{searchTerm}
			{getScouterCount}
			{getMatchBreakdown}
			{teamIsInMatch}
			onMatchClick={(match) => selectedMatchPopup = match}
			onMatchLongPress={(match) => loadMatchIntoSimulator(match)}
			onMatchContextMenu={(e, match) => {
				e.preventDefault();
				contextMenu = { x: e.clientX, y: e.clientY };
				contextMenuMatch = match;
			}}
			onMatchHover={(match) => hoveredMatch = match}
			onMatchHoverEnd={() => hoveredMatch = null}
		/>

		{#if pitMode}
			<div class="animate-in fade-in slide-in-from-top-4 mb-12">
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{#each allTeamsList.filter(tNum => !searchTerm || tNum.includes(searchTerm)) as teamNum}
						{@const pit = pitData.find(p => getVal(p, 'Team number') === teamNum)}
						{@const colors = teamColorsMap.get(teamNum) || { primary: '#3b82f6', secondary: '#1e40af' }}
						<div class="bg-zinc-900/40 border-2 border-zinc-800 rounded-xl md:rounded-[2.5rem] p-3 md:p-6 hover:border-zinc-700 transition-all group cursor-pointer overflow-hidden relative shadow-2xl" 
							style="--team-primary: {colors.primary}; --team-secondary: {colors.secondary}"
							role="button"
							tabindex="0"
							on:click={() => handleRowClick({ 'Team #': teamNum })}
							on:keydown={(e) => e.key === 'Enter' && handleRowClick({ 'Team #': teamNum })}>
							<div class="flex justify-between items-start mb-4 md:mb-6">
								<div>
                  <h2 class="text-3xl md:text-5xl font-black text-white group-hover:text-[var(--team-primary)] transition-colors" style="color: var(--team-primary);">{teamNum}</h2>
									{#if pit}
										<p class="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mt-1">{getVal(pit, 'Drive Train Type')}</p>
									{:else}
										<p class="text-[9px] md:text-[10px] font-black text-red-500/60 uppercase tracking-[0.2em] mt-1">No Pit Info Found</p>
									{/if}
								</div>
								{#if pit && (getVal(pit, 'Under trench?') === 'Yes' || getVal(pit, 'Over bump?') === 'Yes')}
									<div class="flex gap-1.5 flex-wrap justify-end">
										{#if getVal(pit, 'Under trench?') === 'Yes'} <span class="bg-green-900/30 text-green-400 text-[8px] md:text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border border-green-500/20">Trench</span> {/if}
										{#if getVal(pit, 'Over bump?') === 'Yes'} <span class="bg-blue-900/30 text-blue-400 text-[8px] md:text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border border-blue-500/20">Bump</span> {/if}
									</div>
								{/if}
							</div>

							{#if pit && getDriveDirectLink(getVal(pit, 'Bot pic'))}
								<div class="w-full h-48 rounded-3xl overflow-hidden mb-6 bg-black/40 border border-white/5 relative group-hover:scale-[1.02] transition-transform duration-500 cursor-zoom-in"
									role="button"
									tabindex="0"
									on:click|stopPropagation={() => openImageViewer(getDriveDirectLink(getVal(pit, 'Bot pic')))}
									on:keydown={(e) => e.key === 'Enter' && openImageViewer(getDriveDirectLink(getVal(pit, 'Bot pic')))}>
									<img src={getDriveDirectLink(getVal(pit, 'Bot pic'))} alt="Robot" class="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
									<div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
									<div class="absolute top-3 right-3 bg-black/60 text-white text-xs font-black px-3 py-1 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
										🔍 Click to zoom
									</div>
								</div>
							{:else}
								<div class="w-full h-48 rounded-3xl overflow-hidden mb-6 bg-black/20 border-2 border-white/5 flex items-center justify-center border-dashed">
									<p class="text-[10px] font-black text-zinc-700 uppercase tracking-widest">No Visual Data</p>
								</div>
							{/if}

							<div class="space-y-4">
								{#if pit}
									<div class="grid grid-cols-2 gap-3">
										<div class="bg-black/40 p-3 rounded-2xl border border-white/5">
											<p class="text-[8px] font-black text-zinc-500 uppercase mb-1">Dimensions</p>
											<p class="text-xs font-black text-white">{getVal(pit, 'Frame dimensions') || 'N/A'}</p>
										</div>
										<div class="bg-black/40 p-3 rounded-2xl border border-white/5">
											<p class="text-[8px] font-black text-zinc-500 uppercase mb-1">Weight</p>
											<p class="text-xs font-black text-white">{getVal(pit, 'Weight') || 'N/A'} lbs</p>
										</div>
									</div>
									<div class="grid grid-cols-2 gap-3">
										<div class="bg-black/40 p-3 rounded-2xl border border-white/5">
											<p class="text-[8px] font-black text-zinc-500 uppercase mb-1">Drive Coach</p>
											<p class="text-[10px] font-black text-white truncate">{getVal(pit, 'Drive Coach') || 'N/A'}</p>
										</div>
										<div class="bg-black/40 p-3 rounded-2xl border border-white/5">
											<p class="text-[8px] font-black text-zinc-500 uppercase mb-1">Friendliness</p>
											<p class="text-[10px] font-black text-white truncate">{getVal(pit, 'Team Friendliness') || 'N/A'}</p>
										</div>
									</div>
									<div class="bg-black/40 p-3 rounded-2xl border border-white/5">
										<p class="text-[8px] font-black text-zinc-500 uppercase mb-1">Best Auto</p>
										<p class="text-[10px] font-black text-zinc-300 italic">"{getVal(pit, 'Best Auto') || 'N/A'}"</p>
									</div>
								{:else}
									<div class="bg-black/20 p-8 rounded-2xl border-2 border-white/5 border-dashed flex flex-col items-center justify-center text-center gap-2">
										<div class="w-8 h-8 rounded-full border-2 border-red-500/20 flex items-center justify-center mb-2">
											<span class="text-red-500/40 text-xs">!</span>
										</div>
										<p class="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Awaiting Pit Scout</p>
										<p class="text-[8px] font-bold text-zinc-700 uppercase">This team has not been processed in the pits yet.</p>
									</div>
								{/if}
							</div>
							
              <div class="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-700 pointer-events-none" style="color: var(--team-secondary);">
								<h1 class="text-9xl font-black italic">{teamNum}</h1>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else if simulatorMode}
			<!-- Prediction Header -->
			<div class="mb-8 bg-zinc-900/40 border-2 border-zinc-800 rounded-[2.5rem] p-6 md:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden group">
				<div class="absolute -right-10 -top-10 text-9xl opacity-5 group-hover:rotate-12 transition-transform duration-700">⚔️</div>
				<div class="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
					<div class="text-center md:text-left">
						<h2 class="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-2 italic">Match Prediction</h2>
						<p class="text-[10px] md:text-xs font-black text-zinc-500 uppercase tracking-[0.4em]">Simulated Outcome Analysis</p>
					</div>
					
					<div class="flex items-center gap-12 md:gap-20">
						<div class="text-center">
							<p class="text-[9px] md:text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">EPA Probability</p>
							<div class="flex items-center justify-center gap-4">
								<div class="text-right">
									<p class="text-[8px] font-black text-red-500 uppercase">Red</p>
									<p class="text-xl md:text-3xl font-black text-white">{simWinProbs.epa.toLocaleString(undefined, {style: 'percent'})}</p>
								</div>
								<div class="w-[2px] h-10 bg-zinc-800 rounded-full"></div>
								<div class="text-left">
									<p class="text-[8px] font-black text-blue-500 uppercase">Blue</p>
									<p class="text-xl md:text-3xl font-black text-white">{(1 - simWinProbs.epa).toLocaleString(undefined, {style: 'percent'})}</p>
								</div>
							</div>
						</div>
						<div class="text-center">
							<p class="text-[9px] md:text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2">OPR Probability</p>
							<div class="flex items-center justify-center gap-4">
								<div class="text-right">
									<p class="text-[8px] font-black text-red-500 uppercase">Red</p>
									<p class="text-xl md:text-3xl font-black text-white">{simWinProbs.opr.toLocaleString(undefined, {style: 'percent'})}</p>
								</div>
								<div class="w-[2px] h-10 bg-zinc-800 rounded-full"></div>
								<div class="text-left">
									<p class="text-[8px] font-black text-blue-500 uppercase">Blue</p>
									<p class="text-xl md:text-3xl font-black text-white">{(1 - simWinProbs.opr).toLocaleString(undefined, {style: 'percent'})}</p>
								</div>
							</div>
						</div>
					</div>

					<div class="w-full md:w-64 h-3 bg-zinc-800 rounded-full overflow-hidden flex">
						<div class="bg-red-500 h-full transition-all duration-1000 ease-out" style="width: {simWinProbs.epa * 100}%"></div>
						<div class="bg-blue-500 h-full transition-all duration-1000 ease-out" style="width: {(1 - simWinProbs.epa) * 100}%"></div>
					</div>
				</div>
			</div>

			<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 mb-12 animate-in fade-in slide-in-from-top-4">
				<div class="bg-red-950/10 border-2 border-red-500/20 rounded-2xl md:rounded-[2rem] p-4 md:p-8 shadow-2xl backdrop-blur-sm">
					<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 md:mb-8">
						<div>
							<h2 class="text-2xl md:text-3xl font-black text-red-500 uppercase italic tracking-tighter">Red Alliance</h2>
							<p class="text-zinc-500 font-bold text-xs md:text-sm tracking-widest mt-1">
								{simRedTeams.filter(t => t).join(' • ') || 'No Teams Selected'}
							</p>
						</div>
						<div class="flex gap-4 md:gap-6">
							<div class="text-right"><p class="text-[8px] md:text-[10px] font-black text-red-400 uppercase tracking-[0.2em]">EPA</p><p class="text-2xl md:text-4xl font-black text-white">{simAggregates.red.epa.toFixed(1)}</p></div>
							<div class="text-right"><p class="text-[8px] md:text-[10px] font-black text-red-400 uppercase tracking-[0.2em]">OPR</p><p class="text-2xl md:text-4xl font-black text-orange-400">{simAggregates.red.opr.toFixed(1)}</p></div>
						</div>
					</div>
					<RPCards alliance="red" predictions={simRpPredictions.red} />
					<div class="space-y-4 md:space-y-6">
						{#each simRedTeams as team, i}
							<SimulatorTeamCard
								{team}
								teamIndex={i}
								alliance="red"
								{getTeamSummary}
								{teamColorsMap}
								{teamDetailsMap}
								onTeamInput={(idx, val) => { simRedTeams[idx] = val; simRedTeams = [...simRedTeams]; fetchTeamColors(val); }}
								onTeamClick={(t) => handleRowClick({ 'Team #': t })}
								onImageClick={(url) => openImageViewer(url)}
								{getDriveDirectLink}
								{getVal}
								{allTeamsList}
							/>
						{/each}
					</div>
				</div>
				<div class="bg-blue-950/10 border-2 border-blue-500/20 rounded-2xl md:rounded-[2rem] p-4 md:p-8 shadow-2xl backdrop-blur-sm">
					<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 md:mb-8">
						<div>
							<h2 class="text-2xl md:text-3xl font-black text-blue-500 uppercase italic tracking-tighter">Blue Alliance</h2>
							<p class="text-zinc-500 font-bold text-xs md:text-sm tracking-widest mt-1">
								{simBlueTeams.filter(t => t).join(' • ') || 'No Teams Selected'}
							</p>
						</div>
						<div class="flex gap-4 md:gap-6">
							<div class="text-right"><p class="text-[8px] md:text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">EPA</p><p class="text-2xl md:text-4xl font-black text-white">{simAggregates.blue.epa.toFixed(1)}</p></div>
							<div class="text-right"><p class="text-[8px] md:text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">OPR</p><p class="text-2xl md:text-4xl font-black text-orange-400">{simAggregates.blue.opr.toFixed(1)}</p></div>
						</div>
					</div>
					<RPCards alliance="blue" predictions={simRpPredictions.blue} />
					<div class="space-y-4 md:space-y-6">
						{#each simBlueTeams as team, i}
							<SimulatorTeamCard
								{team}
								teamIndex={i}
								alliance="blue"
								{getTeamSummary}
								{teamColorsMap}
								{teamDetailsMap}
								onTeamInput={(idx, val) => { simBlueTeams[idx] = val; simBlueTeams = [...simBlueTeams]; fetchTeamColors(val); }}
								onTeamClick={(t) => handleRowClick({ 'Team #': t })}
								onImageClick={(url) => openImageViewer(url)}
								{getDriveDirectLink}
								{getVal}
								{allTeamsList}
							/>
						{/each}
					</div>
				</div>
			</div>

			<!-- Strategic Recommendations -->
			<div class="mt-12 animate-in fade-in slide-in-from-bottom-4">
				<div class="bg-gradient-to-r from-purple-950/30 via-black/40 to-purple-950/30 border-2 border-purple-500/30 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-sm">
					<h3 class="text-2xl md:text-3xl font-black text-purple-400 uppercase italic tracking-tighter mb-6">Match Strategy</h3>
					
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
						<!-- Red Alliance Strategy -->
						{#if simRedTeams.some(t => t)}
							{@const redStrategy = getAllianceStrategy(simRedTeams.filter(t => t))}
							{#if redStrategy}
								<div class="bg-red-950/20 border-2 border-red-500/20 rounded-2xl p-5 md:p-6">
									<div class="flex items-center gap-2 mb-4">
										<div class="w-3 h-3 rounded-full bg-red-500"></div>
										<h4 class="text-lg md:text-xl font-black text-red-400 uppercase">Red Strategy</h4>
										<span class="text-[10px] md:text-xs font-black text-red-500/60 uppercase ml-auto">{redStrategy.recommendations.length} Teams</span>
									</div>

									<p class="text-sm md:text-base font-bold text-red-300/80 mb-5 italic">{redStrategy.strategy}</p>

									<div class="space-y-3">
										{#each redStrategy.recommendations as rec (rec.teamNum)}
											<div class="bg-black/40 border border-red-500/20 rounded-xl p-3 hover:border-red-500/40 transition">
												<div class="flex items-start justify-between gap-2 mb-2">
													<div>
														<p class="text-[10px] font-black text-red-400 uppercase tracking-tight">Team {rec.teamNum}</p>
														<p class="text-sm md:text-base font-black text-white">{rec.role}</p>
													</div>
													<div class="text-right text-[8px] md:text-[9px]">
														<p class="font-black text-zinc-400">EPA {rec.stats.epa.toFixed(1)}</p>
														<p class="font-black text-zinc-400">Eff {rec.stats.avgEff.toFixed(1)}</p>
													</div>
												</div>
												<p class="text-[8px] md:text-xs text-zinc-300 line-clamp-2">{rec.recommendation}</p>
												{#if rec.issues.length > 0}
													<p class="text-[7px] md:text-[8px] text-red-400/70 mt-2">⚠️ Issues: {rec.issues.join(', ')}</p>
												{/if}
											</div>
										{/each}
									</div>
								</div>
							{/if}
						{/if}

						<!-- Blue Alliance Strategy -->
						{#if simBlueTeams.some(t => t)}
							{@const blueStrategy = getAllianceStrategy(simBlueTeams.filter(t => t))}
							{#if blueStrategy}
								<div class="bg-blue-950/20 border-2 border-blue-500/20 rounded-2xl p-5 md:p-6">
									<div class="flex items-center gap-2 mb-4">
										<div class="w-3 h-3 rounded-full bg-blue-500"></div>
										<h4 class="text-lg md:text-xl font-black text-blue-400 uppercase">Blue Strategy</h4>
										<span class="text-[10px] md:text-xs font-black text-blue-500/60 uppercase ml-auto">{blueStrategy.recommendations.length} Teams</span>
									</div>

									<p class="text-sm md:text-base font-bold text-blue-300/80 mb-5 italic">{blueStrategy.strategy}</p>

									<div class="space-y-3">
										{#each blueStrategy.recommendations as rec (rec.teamNum)}
											<div class="bg-black/40 border border-blue-500/20 rounded-xl p-3 hover:border-blue-500/40 transition">
												<div class="flex items-start justify-between gap-2 mb-2">
													<div>
														<p class="text-[10px] font-black text-blue-400 uppercase tracking-tight">Team {rec.teamNum}</p>
														<p class="text-sm md:text-base font-black text-white">{rec.role}</p>
													</div>
													<div class="text-right text-[8px] md:text-[9px]">
														<p class="font-black text-zinc-400">EPA {rec.stats.epa.toFixed(1)}</p>
														<p class="font-black text-zinc-400">Eff {rec.stats.avgEff.toFixed(1)}</p>
													</div>
												</div>
												<p class="text-[8px] md:text-xs text-zinc-300 line-clamp-2">{rec.recommendation}</p>
												{#if rec.issues.length > 0}
													<p class="text-[7px] md:text-[8px] text-blue-400/70 mt-2">⚠️ Issues: {rec.issues.join(', ')}</p>
												{/if}
											</div>
										{/each}
									</div>
								</div>
							{/if}
						{/if}
					</div>
				</div>
			</div>
		{:else if selectionMode}
			<div class="animate-in fade-in slide-in-from-top-4 mb-12">
				<!-- Search Box for Selection Mode -->
				<div class="mb-6 max-w-md">
					<div class="relative">
						<input
							type="text"
							bind:value={selectionSearchTerm}
							placeholder="Go to team (name or #)..."
							class="w-full bg-zinc-900/60 border-2 border-orange-500/20 rounded-2xl p-4 pl-12 focus:border-orange-500/50 outline-none transition-all font-black text-orange-400 placeholder:text-orange-950/40"
						/>
						<svg class="w-6 h-6 absolute left-4 top-1/2 -translate-y-1/2 text-orange-500/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
					</div>
				</div>

				<!-- Desktop Table -->
				<div class="hidden md:block bg-zinc-900/40 rounded-[2.5rem] border-2 border-orange-500/20 shadow-2xl backdrop-blur-xl overflow-x-auto">
					<table class="w-full text-left border-separate border-spacing-0">
						<thead>
							<tr class="bg-orange-950/20 text-orange-400 text-[10px] font-black uppercase tracking-[0.3em]">
								<th class="p-8 border-b-2 border-zinc-800 cursor-pointer hover:text-white" on:click={() => handleSort('Team #')}>Team {sortKey === 'Team #' ? (sortOrder === 1 ? '↑' : '↓') : ''}</th>
								<th class="p-8 border-b-2 border-zinc-800 text-center">Cross Off</th>
								<th class="p-8 border-b-2 border-zinc-800 cursor-pointer hover:text-white text-center" on:click={() => handleSort('EPA')}>EPA (Statbotics) {sortKey === 'EPA' ? (sortOrder === 1 ? '↑' : '↓') : ''}</th>
								<th class="p-8 border-b-2 border-zinc-800 cursor-pointer hover:text-white text-center" on:click={() => handleSort('OPR')}>OPR (TBA) {sortKey === 'OPR' ? (sortOrder === 1 ? '↑' : '↓') : ''}</th>
								<th class="p-8 border-b-2 border-zinc-800 cursor-pointer hover:text-white text-center" on:click={() => handleSort('Rank')}>Event Rank {sortKey === 'Rank' ? (sortOrder === 1 ? '↑' : '↓') : ''}</th>
								<th class="p-8 border-b-2 border-zinc-800 cursor-pointer hover:text-white text-center" on:click={() => handleSort('Avg Eff.')}>Avg Eff. {sortKey === 'Avg Eff.' ? (sortOrder === 1 ? '↑' : '↓') : ''}</th>
								<th class="p-8 border-b-2 border-zinc-800 cursor-pointer hover:text-white text-center" on:click={() => handleSort('Climb Rate')}>Climb Rate {sortKey === 'Climb Rate' ? (sortOrder === 1 ? '↑' : '↓') : ''}</th>
								<th class="p-8 border-b-2 border-zinc-800 cursor-pointer hover:text-white text-center" on:click={() => handleSort('Samples')}>Samples {sortKey === 'Samples' ? (sortOrder === 1 ? '↑' : '↓') : ''}</th>
								<th class="p-8 border-b-2 border-zinc-800 text-center">Matches w/ Issues</th>
								<th class="p-8 border-b-2 border-zinc-800">Intelligence</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-zinc-800">
							{#each filteredLeaderboard as m}
								{@const issuesMatches = getMatchesWithIssues(m.teamNum)}
								{@const isCrossedOff = crossedOffTeams.has(m.teamNum)}
								<tr class="hover:bg-orange-500/10 transition-all duration-300 cursor-pointer group {isCrossedOff ? 'opacity-30 line-through decoration-orange-500 decoration-4' : ''}" on:click={() => handleRowClick({ 'Team #': m.teamNum })}>
									<td class="p-2 md:p-8 font-black text-white group-hover:pl-4 md:group-hover:pl-12 transition-all">
										<div class="text-xl md:text-4xl">{m.teamNum}</div>
										{#if teamDetailsMap.get(m.teamNum)}
											<div class="text-[10px] md:text-sm text-zinc-500 font-bold truncate">
												{teamDetailsMap.get(m.teamNum).nickname}
												<br/>
												<span class="text-[8px] md:text-xs opacity-60 italic">{teamDetailsMap.get(m.teamNum).city}, {teamDetailsMap.get(m.teamNum).state_prov}</span>
											</div>
										{/if}
									</td>
									<td class="p-8 text-center">
										<button 
											on:click|stopPropagation={() => toggleCrossOff(m.teamNum)}
											class="p-4 rounded-full transition-all {isCrossedOff ? 'bg-orange-500 text-white shadow-lg scale-110' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300'}">
											<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12" /></svg>
										</button>
									</td>
									<td class="p-8 text-center"><span class="text-3xl font-black text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">{m.epa.toFixed(1)}</span></td>
									<td class="p-8 text-center"><span class="text-3xl font-black text-zinc-300">{m.opr.toFixed(1)}</span></td>
									<td class="p-8 text-center"><span class="text-3xl font-black text-zinc-300">{m.eventRank}</span></td>
									<td class="p-8 text-center"><span class="text-3xl font-black text-orange-400">{m.avgEff.toFixed(1)}</span></td>
									<td class="p-8 text-center"><span class="text-2xl font-black {m.climbRate > 0.7 ? 'text-purple-400' : 'text-zinc-600'}">{(m.climbRate * 100).toFixed(0)}%</span></td>
									<td class="p-8 text-center"><span class="text-xs font-black text-zinc-500 uppercase tracking-widest">{m.entryCount} matches</span></td>
									<td class="p-8 text-center">
										{#if issuesMatches.length > 0}
											<div class="flex flex-wrap gap-1.5 justify-center">
												{#each issuesMatches as issue}
													<div class="flex items-center gap-1 bg-red-950/40 border border-red-500/30 px-2 py-1 rounded-lg group/issue hover:bg-red-950/60 transition-all" title="M{issue.matchNum}: {issue.hasMechanical ? 'Mech ' : ''}{issue.hasTipped ? 'Tipped ' : ''}{issue.hasDied ? 'Dead ' : ''}{issue.hasCard ? issue.hasCard : ''}">
														<span class="text-[10px] font-black text-red-300">M{issue.matchNum}</span>
														<div class="flex gap-0.5">
															{#if issue.hasMechanical}<span class="text-xs" title="Mechanical Issue">⚙️</span>{/if}
															{#if issue.hasTipped}<span class="text-xs" title="Tipped">⚠️</span>{/if}
															{#if issue.hasDied}<span class="text-xs" title="Dead">💀</span>{/if}
															{#if issue.hasCard}<span class="text-xs" title="Card">🟡</span>{/if}
														</div>
													</div>
												{/each}
											</div>
										{:else}
											<span class="text-xs font-black text-zinc-600 uppercase">—</span>
										{/if}
									</td>
									<td class="p-8">
										<button class="bg-zinc-800 hover:bg-blue-600 text-white text-[10px] font-black px-4 py-2 rounded-xl transition uppercase tracking-widest">View Intel</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Mobile Cards -->
				<div class="md:hidden space-y-3">
					{#each filteredLeaderboard as m}
						{@const issuesMatches = getMatchesWithIssues(m.teamNum)}
						{@const isCrossedOff = crossedOffTeams.has(m.teamNum)}
						<div class="bg-zinc-900/40 border-2 border-orange-500/20 rounded-2xl p-4 shadow-xl backdrop-blur-xl cursor-pointer hover:border-orange-500/40 transition-all {isCrossedOff ? 'opacity-30' : ''}" on:click={() => handleRowClick({ 'Team #': m.teamNum })}>
							<div class="flex justify-between items-start gap-3 mb-3">
								<div class="flex-1">
									<p class="text-2xl font-black {isCrossedOff ? 'line-through decoration-orange-500 decoration-2' : 'text-orange-400'}">{m.teamNum}</p>
									<p class="text-xs text-zinc-500 font-black uppercase mt-1">{m.entryCount} matches</p>
								</div>
								<div class="flex gap-2">
									<button 
										on:click|stopPropagation={() => toggleCrossOff(m.teamNum)}
										class="p-2 rounded-lg transition-all {isCrossedOff ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-500'}">
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12" /></svg>
									</button>
									<button on:click|stopPropagation={() => handleRowClick({ 'Team #': m.teamNum })} class="bg-zinc-800 hover:bg-orange-600 text-white text-[9px] font-black px-3 py-1.5 rounded-lg transition uppercase tracking-widest flex-shrink-0">View</button>
								</div>
							</div>
							<div class="grid grid-cols-3 gap-2">
								<div class="bg-black/30 p-2 rounded-lg">
									<p class="text-[7px] font-black text-blue-400 uppercase">EPA</p>
									<p class="text-lg font-black text-white">{m.epa.toFixed(1)}</p>
								</div>
								<div class="bg-black/30 p-2 rounded-lg">
									<p class="text-[7px] font-black text-zinc-400 uppercase">OPR</p>
									<p class="text-lg font-black text-white">{m.opr.toFixed(1)}</p>
								</div>
								<div class="bg-black/30 p-2 rounded-lg">
									<p class="text-[7px] font-black text-purple-400 uppercase">Climb</p>
									<p class="text-lg font-black text-white">{(m.climbRate * 100).toFixed(0)}%</p>
								</div>
							</div>
							<div class="mt-2 p-2 bg-black/20 rounded-lg">
								<p class="text-[7px] font-black text-orange-400 uppercase mb-1">Scoring Eff</p>
								<p class="text-base font-black text-orange-400">{m.avgEff.toFixed(1)}/5</p>
							</div>
							{#if issuesMatches.length > 0}
								<div class="mt-2 p-2 bg-red-950/40 rounded-lg border border-red-500/30">
									<p class="text-[7px] font-black text-red-400 uppercase mb-1">Issues</p>
									<div class="flex flex-wrap gap-1">
										{#each issuesMatches as issue}
											<span class="text-[10px] font-black bg-red-900/60 text-red-200 px-1.5 py-0.5 rounded" title="M{issue.matchNum}">M{issue.matchNum}</span>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{:else if defenseMode}
			<div class="animate-in fade-in slide-in-from-top-4 mb-12">
				<!-- Desktop Table -->
				<div class="hidden md:block bg-zinc-900/40 rounded-[2.5rem] border-2 border-red-500/20 shadow-2xl backdrop-blur-xl overflow-x-auto">
					<table class="w-full text-left border-separate border-spacing-0">
						<thead>
							<tr class="bg-red-950/20 text-red-400 text-[10px] font-black uppercase tracking-[0.3em]">
								<th class="p-8 border-b-2 border-zinc-800 cursor-pointer hover:text-white" on:click={() => handleSort('Team #')}>Team {sortKey === 'Team #' ? (sortOrder === 1 ? '↑' : '↓') : ''}</th>
								<th class="p-8 border-b-2 border-zinc-800 cursor-pointer hover:text-white text-center" on:click={() => handleSort('Match #')}>Match {sortKey === 'Match #' ? (sortOrder === 1 ? '↑' : '↓') : ''}</th>
								<th class="p-8 border-b-2 border-zinc-800 cursor-pointer hover:text-white text-center" on:click={() => handleSort('Def Time')}>Defense Time {sortKey === 'Def Time' ? (sortOrder === 1 ? '↑' : '↓') : ''}</th>
								<th class="p-8 border-b-2 border-zinc-800 cursor-pointer hover:text-white text-center" on:click={() => handleSort('Def Score')}>Defense Score {sortKey === 'Def Score' ? (sortOrder === 1 ? '↑' : '↓') : ''}</th>
								<th class="p-8 border-b-2 border-zinc-800">Comments</th>
								<th class="p-8 border-b-2 border-zinc-800">Actions</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-zinc-800">
							{#each defenseMetrics as m}
								<tr class="hover:bg-red-500/10 transition-all duration-300 cursor-pointer group" on:click={() => handleRowClick({ 'Team #': m.teamNum, 'Match #': m.matchNum })}>
									<td class="p-8 font-black text-red-400 group-hover:pl-12 transition-all">
										<div class="text-3xl">{m.teamNum}</div>
										{#if teamDetailsMap.get(m.teamNum)}
											<div class="text-sm text-zinc-500 font-bold truncate">
												{teamDetailsMap.get(m.teamNum).nickname}
												<br/>
												<span class="text-xs opacity-60 italic">{teamDetailsMap.get(m.teamNum).city}, {teamDetailsMap.get(m.teamNum).state_prov}</span>
											</div>
										{/if}
									</td>
									<td class="p-8 text-center"><span class="text-2xl font-black text-white">M{m.matchNum}</span></td>
									<td class="p-8 text-center">
										<span class="text-2xl font-black text-orange-400">{m.defenseTime}s</span>
										{#if m.defenseTime > 0}
											<div class="w-full bg-zinc-800 h-2 rounded-full mt-2 overflow-hidden">
												<div class="bg-orange-500 h-full rounded-full transition-all" style="width: {Math.min(100, (m.defenseTime / 150) * 100)}%"></div>
											</div>
										{/if}
									</td>
									<td class="p-8 text-center">
										<span class="text-3xl font-black {m.defenseScore >= 4 ? 'text-red-400' : m.defenseScore >= 3 ? 'text-orange-400' : 'text-zinc-500'}">{m.defenseScore.toFixed(1)}</span>
									</td>
									<td class="p-8 max-w-md">
										<p class="text-sm text-zinc-400 italic truncate">{m.comments || 'No comments'}</p>
									</td>
									<td class="p-8">
										<button class="bg-zinc-800 hover:bg-red-600 text-white text-[10px] font-black px-4 py-2 rounded-xl transition uppercase tracking-widest">View Details</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Mobile Cards -->
				<div class="md:hidden space-y-3">
					{#each defenseMetrics as m}
						<div class="bg-zinc-900/40 border-2 border-red-500/20 rounded-2xl p-4 shadow-xl backdrop-blur-xl cursor-pointer hover:border-red-500/40 transition-all" on:click={() => handleRowClick({ 'Team #': m.teamNum, 'Match #': m.matchNum })}>
							<div class="flex justify-between items-start gap-3 mb-3">
								<div class="flex-1">
									<p class="text-2xl font-black text-red-400">{m.teamNum}</p>
									<p class="text-xs text-zinc-500 font-black uppercase mt-1">Match {m.matchNum}</p>
								</div>
								<button on:click|stopPropagation={() => handleRowClick({ 'Team #': m.teamNum, 'Match #': m.matchNum })} class="bg-zinc-800 hover:bg-red-600 text-white text-[9px] font-black px-3 py-1.5 rounded-lg transition uppercase tracking-widest flex-shrink-0">View</button>
							</div>
							<div class="grid grid-cols-2 gap-2 mb-2">
								<div class="bg-black/30 p-2 rounded-lg">
									<p class="text-[7px] font-black text-orange-400 uppercase">Defense Time</p>
									<p class="text-lg font-black text-white">{m.defenseTime}s</p>
									{#if m.defenseTime > 0}
										<div class="w-full bg-zinc-800 h-1 rounded-full mt-1 overflow-hidden">
											<div class="bg-orange-500 h-full rounded-full transition-all" style="width: {Math.min(100, (m.defenseTime / 150) * 100)}%"></div>
										</div>
									{/if}
								</div>
								<div class="bg-black/30 p-2 rounded-lg">
									<p class="text-[7px] font-black text-red-400 uppercase">Def Score</p>
									<p class="text-lg font-black {m.defenseScore >= 4 ? 'text-red-400' : m.defenseScore >= 3 ? 'text-orange-400' : 'text-zinc-500'}">{m.defenseScore.toFixed(1)}</p>
								</div>
							</div>
							{#if m.comments}
								<div class="p-2 bg-black/20 rounded-lg">
									<p class="text-[7px] font-black text-zinc-400 uppercase mb-1">Comment</p>
									<p class="text-xs text-zinc-300 italic truncate">{m.comments}</p>
								</div>
							{/if}
						</div>
					{/each}
				</div>
				
				{#if defenseMetrics.length === 0}
					<div class="text-center py-12 md:py-20 text-zinc-600 font-black uppercase tracking-widest">
						<p class="text-lg md:text-2xl mb-2">No Defense Data Available</p>
						<p class="text-xs md:text-sm text-zinc-700">Teams with defense actions will appear here</p>
					</div>
				{/if}
			</div>
		{:else if scoutLeadMode}
			<div class="animate-in fade-in slide-in-from-top-4 mb-12 space-y-6">
				<!-- 2. Field Overview (Momentum & Red Flags) -->
				<details class="group bg-zinc-900/40 border-2 border-blue-500/20 rounded-[2.5rem] shadow-xl overflow-hidden backdrop-blur-xl">
					<summary class="p-6 md:p-8 cursor-pointer list-none flex items-center justify-between hover:bg-blue-500/5 transition-colors">
						<div class="flex items-center gap-6">
							<div class="w-16 h-16 rounded-2xl bg-blue-500/10 border-2 border-blue-500/20 flex flex-col items-center justify-center">
								<svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
							</div>
							<div>
								<h2 class="text-xl md:text-3xl font-black text-blue-500 uppercase tracking-tighter">Field Overview</h2>
								<p class="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">Momentum Trends and Incident Tracking</p>
							</div>
						</div>
						<svg class="w-6 h-6 text-zinc-500 group-open:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" /></svg>
					</summary>
					<div class="p-6 md:p-10 pt-0 space-y-8">
						<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
							<!-- Team Momentum Sub-Dropdown -->
							<details class="group/sub bg-black/40 border-2 border-zinc-800 rounded-[2rem] overflow-hidden" open>
								<summary class="p-6 cursor-pointer list-none flex items-center justify-between hover:bg-white/5 transition-colors">
									<div class="flex items-center gap-3">
										<div class="w-1.5 h-6 bg-blue-500 rounded-full"></div>
										<h4 class="text-lg font-black text-white uppercase tracking-tight">Performance Momentum</h4>
									</div>
									<svg class="w-4 h-4 text-zinc-500 group-open/sub:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" /></svg>
								</summary>
								<div class="max-h-[400px] overflow-y-auto custom-scrollbar border-t border-zinc-800/50">
									<table class="w-full text-left border-separate border-spacing-0">
										<thead class="sticky top-0 bg-zinc-900 z-10">
											<tr class="text-[8px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800">
												<th class="p-4">Team</th>
												<th class="p-4">Trend</th>
												<th class="p-4 text-right">Change</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-zinc-800/50">
											{#each teamMomentum as m}
												<tr class="hover:bg-white/5 transition-colors cursor-pointer group/row" on:click={() => handleRowClick({ 'Team #': m.teamNum })}>
													<td class="p-4 font-black text-white group-hover/row:text-blue-400 transition-colors">{m.teamNum}</td>
													<td class="p-4">
														<div class="flex items-center gap-2">
															<div class="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden min-w-[60px]">
																<div class="h-full {m.diff > 0 ? 'bg-green-500' : 'bg-red-500'}" style="width: {Math.min(100, Math.abs(m.diff) * 20)}%"></div>
															</div>
														</div>
													</td>
													<td class="p-4 text-right">
														<span class="font-black text-xs {m.diff > 0 ? 'text-green-500' : m.diff < 0 ? 'text-red-500' : 'text-zinc-500'}">
															{m.diff > 0 ? '+' : ''}{m.diff.toFixed(1)}
														</span>
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							</details>

							<!-- Red Flag Watchlist Sub-Dropdown -->
							<details class="group/sub bg-black/40 border-2 border-red-500/10 rounded-[2rem] overflow-hidden" open>
								<summary class="p-6 cursor-pointer list-none flex items-center justify-between hover:bg-white/5 transition-colors">
									<div class="flex items-center gap-3">
										<div class="w-1.5 h-6 bg-red-500 rounded-full"></div>
										<h4 class="text-lg font-black text-white uppercase tracking-tight">Red Flag Watchlist</h4>
									</div>
									<svg class="w-4 h-4 text-zinc-500 group-open/sub:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" /></svg>
								</summary>
								<div class="max-h-[400px] overflow-y-auto custom-scrollbar border-t border-red-500/10">
									<div class="divide-y divide-red-500/10">
										{#each redFlagWatchlist as team}
											<div class="p-4 hover:bg-red-500/5 transition-colors cursor-pointer group/row" on:click={() => handleRowClick({ 'Team #': team.teamNum })}>
												<div class="flex items-center justify-between mb-3">
													<p class="text-xl font-black text-white group-hover/row:text-red-400 transition-colors">{team.teamNum}</p>
													<span class="text-[10px] font-black text-red-500 uppercase">{team.issues.length} incidents</span>
												</div>
												<div class="flex flex-wrap gap-2">
													{#each team.issues as issue}
														<div class="flex items-center gap-1.5 bg-red-950/40 border border-red-500/20 px-2 py-1 rounded-lg">
															<span class="text-[9px] font-black text-red-300">M{issue.matchNum}</span>
															<div class="flex gap-1">
																{#if issue.hasMechanical}<span title="Mechanical">⚙️</span>{/if}
																{#if issue.hasTipped}<span title="Tipped">⚠️</span>{/if}
																{#if issue.hasDied}<span title="Died">💀</span>{/if}
																{#if issue.hasCard}<span title="Card">🟡</span>{/if}
															</div>
														</div>
													{/each}
												</div>
											</div>
										{/each}
										{#if redFlagWatchlist.length === 0}
											<div class="p-12 text-center">
												<p class="text-zinc-600 font-black uppercase tracking-widest">No red flags detected</p>
											</div>
										{/if}
									</div>
								</div>
							</details>
						</div>
					</div>
				</details>

				<!-- 3. Missing Scouting Entries -->
				<details class="group bg-zinc-900/40 border-2 border-yellow-500/20 rounded-[2.5rem] shadow-xl overflow-hidden backdrop-blur-xl">
					<summary class="p-6 md:p-8 cursor-pointer list-none flex items-center justify-between hover:bg-yellow-500/5 transition-colors">
						<div class="flex items-center gap-6">
							<div class="w-16 h-16 rounded-2xl bg-yellow-500/10 border-2 border-yellow-500/20 flex flex-col items-center justify-center">
								<svg class="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
							</div>
							<div>
								<h2 class="text-xl md:text-3xl font-black text-yellow-500 uppercase tracking-tighter">Missing Matches</h2>
								<p class="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">Identified Missing Scouting Entries by Match</p>
							</div>
						</div>
						<div class="flex items-center gap-4">
							<span class="text-[10px] font-black text-yellow-500/60 uppercase tracking-[0.2em] hidden md:block">{scoutLeadData.length} matches remaining</span>
							<svg class="w-6 h-6 text-zinc-500 group-open:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" /></svg>
						</div>
					</summary>
					<div class="p-6 md:p-10 pt-0 space-y-4">
						{#each scoutLeadData as m}
							<details class="group/match bg-black/40 border-2 border-zinc-800 rounded-[2rem] overflow-hidden backdrop-blur-sm">
								<summary class="p-6 md:p-8 cursor-pointer list-none flex items-center justify-between hover:bg-yellow-500/5 transition-colors">
									<div class="flex items-center gap-6">
										<div class="w-16 h-16 rounded-2xl bg-yellow-500/10 border-2 border-yellow-500/20 flex flex-col items-center justify-center">
											<p class="text-[8px] font-black text-yellow-500 uppercase">Match</p>
											<p class="text-2xl font-black text-white">{m.match_number}</p>
										</div>
										<div>
											<p class="text-xl font-black text-white">{m.missing.length} Teams Missing</p>
											<p class="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">Click to expand details</p>
										</div>
									</div>
									<div class="flex items-center gap-4">
										<div class="flex gap-2 mr-4">
											{#each m.videos as video}
												{#if video.type === 'youtube'}
													<a href="https://youtube.com/watch?v={video.key}" target="_blank" rel="noopener noreferrer" class="bg-zinc-800 hover:bg-red-600 text-white p-2 rounded-lg transition" on:click|stopPropagation>
														<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
													</a>
												{/if}
											{/each}
										</div>
										<svg class="w-6 h-6 text-zinc-500 group-open/match:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" /></svg>
									</div>
								</summary>
								<div class="p-8 border-t-2 border-zinc-800 bg-black/20">
									<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
										<!-- Red Alliance -->
										<div>
											<p class="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
												<span class="w-2 h-2 rounded-full bg-red-500"></span> Red Alliance
											</p>
											<div class="space-y-3">
												{#each m.missing.filter(t => t.alliance === 'red') as t}
													<div class="flex items-center justify-between p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
														<p class="text-2xl font-black text-white">{t.team}</p>
														<button on:click={() => handleRowClick({ 'Team #': t.team })} class="bg-zinc-800 hover:bg-yellow-600 text-white text-[9px] font-black px-4 py-2 rounded-lg transition uppercase tracking-widest">View Team</button>
													</div>
												{/each}
												{#if m.missing.filter(t => t.alliance === 'red').length === 0}
													<p class="text-xs font-black text-zinc-700 uppercase italic">All scouted</p>
												{/if}
											</div>
										</div>
										<!-- Blue Alliance -->
										<div>
											<p class="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
												<span class="w-2 h-2 rounded-full bg-blue-500"></span> Blue Alliance
											</p>
											<div class="space-y-3">
												{#each m.missing.filter(t => t.alliance === 'blue') as t}
													<div class="flex items-center justify-between p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
														<p class="text-2xl font-black text-white">{t.team}</p>
														<button on:click={() => handleRowClick({ 'Team #': t.team })} class="bg-zinc-800 hover:bg-yellow-600 text-white text-[9px] font-black px-4 py-2 rounded-lg transition uppercase tracking-widest">View Team</button>
													</div>
												{/each}
												{#if m.missing.filter(t => t.alliance === 'blue').length === 0}
													<p class="text-xs font-black text-zinc-700 uppercase italic">All scouted</p>
												{/if}
											</div>
										</div>
									</div>
								</div>
							</details>
						{/each}

						{#if scoutLeadData.length === 0}
							<div class="text-center py-20 text-zinc-600 font-black uppercase tracking-widest bg-zinc-900/20 rounded-[2.5rem] border-2 border-zinc-800 border-dashed">
								<p class="text-2xl mb-2">Full Coverage Achieved</p>
								<p class="text-sm text-zinc-700">All scheduled matches have been scouted</p>
							</div>
						{/if}
					</div>
				</details>
				<!-- 1. Alliance Selection Predictions -->
				<details class="group bg-zinc-900/40 border-2 border-orange-500/20 rounded-[2.5rem] shadow-xl overflow-hidden backdrop-blur-xl">
					<summary class="p-6 md:p-8 cursor-pointer list-none flex items-center justify-between hover:bg-orange-500/5 transition-colors">
						<div class="flex items-center gap-6">
							<div class="w-16 h-16 rounded-2xl bg-orange-500/10 border-2 border-yellow-500/20 flex flex-col items-center justify-center">
								<p class="text-3xl font-black text-orange-500">!</p>
							</div>
							<div>
								<h2 class="text-xl md:text-3xl font-black text-orange-500 uppercase tracking-tighter">Alliance Predictions</h2>
								<p class="text-xs font-bold text-red-500 uppercase tracking-widest mt-1">ONLY for scouting lead and drive coach. Restricted Information.</p>
							</div>
						</div>
						<svg class="w-6 h-6 text-zinc-500 group-open:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" /></svg>
					</summary>
					<div class="p-6 md:p-10 pt-0">
						<EventProgressMap
							{schedule}
							{hoveredMatch}
							{matchPredictions}
							hasOverrides={matchOverrides.size > 0}
							onMatchClick={(match) => selectedMatchPopup = match}
							onMatchLongPress={(match) => cycleMatchOverride(match)}
							onMatchContextMenu={(e, match) => {
								const pred = matchPredictions.find(p => p.match_number === match.match_number);
								if (pred && !pred.played) {
									openOverrideMenu(e, `Match ${match.match_number}`, 'quals');
								} else {
									e.preventDefault();
									contextMenu = { x: e.clientX, y: e.clientY };
									contextMenuMatch = match;
								}
							}}
							onMatchHover={(match) => hoveredMatch = match}
							onMatchHoverEnd={() => hoveredMatch = null}
							onClearOverrides={clearAllOverrides}
						/>
						{#if allianceSimulation.length > 0}
							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
								{#each allianceSimulation as alliance, i}
									<div class="bg-black/40 border-2 border-zinc-800 rounded-2xl p-4 hover:border-orange-500/20 transition-all group">
										<div class="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800">
											<p class="text-[10px] font-black text-orange-500 uppercase">Alliance {i+1}</p>
											<p class="text-[8px] font-black text-zinc-600 uppercase">Total EPA: {( (teamStatsMap.get(alliance.captain)?.epa || 0) + alliance.picks.reduce((acc, p) => acc + (teamStatsMap.get(p)?.epa || 0), 0) ).toFixed(1)}</p>
										</div>
										<div class="space-y-3">
											<!-- Captain -->
											<div class="flex items-center justify-between group/team cursor-pointer" on:click={() => handleRowClick({ 'Team #': alliance.captain })}>
												<div>
													<p class="text-[8px] font-black text-zinc-500 uppercase mb-0.5">Captain</p>
													<p class="text-xl font-black text-white group-hover/team:text-orange-500 transition-colors">{alliance.captain}</p>
												</div>
												<div class="text-right">
													<p class="text-[8px] font-black text-zinc-600 uppercase">EPA</p>
													<p class="text-xs font-black text-zinc-400">{teamStatsMap.get(alliance.captain)?.epa.toFixed(1) || 'N/A'}</p>
												</div>
											</div>
											<!-- Picks -->
											{#each alliance.picks as pickNum, pickIdx}
												<div class="flex items-center justify-between group/team cursor-pointer" on:click={() => handleRowClick({ 'Team #': pickNum })}>
													<div>
														<p class="text-[8px] font-black text-zinc-500 uppercase mb-0.5">Pick {pickIdx + 1}</p>
														<p class="text-lg font-black text-zinc-300 group-hover/team:text-orange-500 transition-colors">{pickNum}</p>
													</div>
													<div class="text-right">
														<p class="text-[8px] font-black text-zinc-600 uppercase">EPA</p>
														<p class="text-xs font-black text-zinc-400">{teamStatsMap.get(pickNum)?.epa.toFixed(1) || 'N/A'}</p>
													</div>
												</div>
											{/each}
										</div>
									</div>
								{/each}
							</div>

							{#if bracketSimulation}
								<PlayoffProgressMap
									bracketMatches={bracketSimulation.matches}
									alliances={bracketSimulation.alliances}
									{playoffOverrides}
									hasOverrides={playoffOverrides.size > 0}
									onMatchClick={(m) => loadPlayoffMatchIntoSim(m)}
									onMatchLongPress={(m) => { if (!m.played) cyclePlayoffOverride(m.label); }}
									onMatchContextMenu={(e, m) => { if (!m.played) openOverrideMenu(e, m.label, 'playoff'); }}
									onClearOverrides={clearPlayoffOverrides}
								/>

								<div class="mt-8 animate-in fade-in slide-in-from-bottom-4">
									<h3 class="text-xl md:text-2xl font-black text-orange-400 uppercase tracking-tighter mb-6 flex items-center gap-3">
										<span class="bg-orange-500/10 p-2 rounded-lg border border-orange-500/20">🏆</span>
										{actualAlliances.length > 0 ? 'Playoff Bracket' : 'Predicted Bracket Outcome'}
									</h3>

									<!-- UPPER BRACKET -->
									<div class="mb-8">
										<p class="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-3 pl-1">Upper Bracket</p>
										<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
											{#each bracketSimulation.upper as round}
												<div class="space-y-3">
													<p class="text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">{round.name}</p>
													{#each round.matches as m}
														{@const a1Num = effectiveAlliances.indexOf(m.a1) + 1}
														{@const a2Num = effectiveAlliances.indexOf(m.a2) + 1}
														<button
															class="w-full text-left rounded-xl p-3 text-xs transition-all duration-200 hover:scale-[1.02] {m.played ? 'bg-zinc-900/80 border border-zinc-700' : m.override ? 'bg-zinc-900/60 border-2 border-yellow-400 ring-1 ring-yellow-400/40 shadow-md shadow-yellow-400/20' : 'bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700'}"
															on:click={() => loadPlayoffMatchIntoSim(m)}
															on:contextmenu|preventDefault={(e) => { if (!m.played) openOverrideMenu(e, m.label, 'playoff'); }}
														>
															<div class="flex justify-between items-center mb-1.5">
																<span class="text-zinc-500 font-bold">{m.label}</span>
																{#if m.played}
																	<span class="text-[9px] font-black text-green-400 uppercase">Final</span>
																{:else if m.override}
																	<span class="text-[9px] font-black text-yellow-400 uppercase">Override</span>
																{:else}
																	<span class="text-[10px] font-black text-blue-500 uppercase">{(m.winProb > 0.5 ? m.winProb : 1-m.winProb).toLocaleString(undefined, {style: 'percent'})} Win</span>
																{/if}
															</div>
															<div class="space-y-1">
																<div class="flex justify-between {m.winner === m.a1 ? 'text-white font-black' : 'text-zinc-500'}">
																	<span>A{a1Num} <span class="text-zinc-600 font-normal">{m.a1?.captain}</span></span>
																	<span>{m.played ? m.redScore : m.epa1.toFixed(0)}</span>
																</div>
																<div class="flex justify-between {m.winner === m.a2 ? 'text-white font-black' : 'text-zinc-500'}">
																	<span>A{a2Num} <span class="text-zinc-600 font-normal">{m.a2?.captain}</span></span>
																	<span>{m.played ? m.blueScore : m.epa2.toFixed(0)}</span>
																</div>
															</div>
														</button>
													{/each}
												</div>
											{/each}
										</div>
									</div>

									<!-- LOWER BRACKET -->
									<div class="mb-8">
										<p class="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-3 pl-1">Lower Bracket</p>
										<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
											{#each bracketSimulation.lower as round}
												<div class="space-y-3">
													<p class="text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">{round.name}</p>
													{#each round.matches as m}
														{@const a1Num = effectiveAlliances.indexOf(m.a1) + 1}
														{@const a2Num = effectiveAlliances.indexOf(m.a2) + 1}
														<button
															class="w-full text-left rounded-xl p-3 text-xs transition-all duration-200 hover:scale-[1.02] {m.played ? 'bg-zinc-900/80 border border-zinc-700' : m.override ? 'bg-zinc-900/60 border-2 border-yellow-400 ring-1 ring-yellow-400/40 shadow-md shadow-yellow-400/20' : 'bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700'}"
															on:click={() => loadPlayoffMatchIntoSim(m)}
															on:contextmenu|preventDefault={(e) => { if (!m.played) openOverrideMenu(e, m.label, 'playoff'); }}
														>
															<div class="flex justify-between items-center mb-1.5">
																<span class="text-zinc-500 font-bold">{m.label}</span>
																{#if m.played}
																	<span class="text-[9px] font-black text-green-400 uppercase">Final</span>
																{:else if m.override}
																	<span class="text-[9px] font-black text-yellow-400 uppercase">Override</span>
																{:else}
																	<span class="text-[10px] font-black text-blue-500 uppercase">{(m.winProb > 0.5 ? m.winProb : 1-m.winProb).toLocaleString(undefined, {style: 'percent'})} Win</span>
																{/if}
															</div>
															<div class="space-y-1">
																<div class="flex justify-between {m.winner === m.a1 ? 'text-white font-black' : 'text-zinc-500'}">
																	<span>A{a1Num} <span class="text-zinc-600 font-normal">{m.a1?.captain}</span></span>
																	<span>{m.played ? m.redScore : m.epa1.toFixed(0)}</span>
																</div>
																<div class="flex justify-between {m.winner === m.a2 ? 'text-white font-black' : 'text-zinc-500'}">
																	<span>A{a2Num} <span class="text-zinc-600 font-normal">{m.a2?.captain}</span></span>
																	<span>{m.played ? m.blueScore : m.epa2.toFixed(0)}</span>
																</div>
															</div>
														</button>
													{/each}
												</div>
											{/each}
										</div>
									</div>

									<!-- GRAND FINALS -->
									<div>
										<p class="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-3 pl-1">Grand Finals</p>
										<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
											{#each [bracketSimulation.finals] as gf}
												{@const gfA1 = effectiveAlliances.indexOf(gf.a1) + 1}
												{@const gfA2 = effectiveAlliances.indexOf(gf.a2) + 1}
												<button
													class="w-full text-left rounded-xl p-4 text-xs transition-all duration-200 hover:scale-[1.02] {gf.played ? 'bg-zinc-900/80 border border-zinc-700' : gf.override ? 'bg-zinc-900/60 border-2 border-yellow-400 ring-1 ring-yellow-400/40 shadow-md shadow-yellow-400/20' : 'bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700'}"
													on:click={() => loadPlayoffMatchIntoSim(gf)}
													on:contextmenu|preventDefault={(e) => { if (!gf.played) openOverrideMenu(e, gf.label, 'playoff'); }}
												>
													<div class="flex justify-between items-center mb-2">
														<span class="text-zinc-500 font-bold">{gf.label}</span>
														{#if gf.played}
															<span class="text-[9px] font-black text-green-400 uppercase">Final</span>
														{:else if gf.override}
															<span class="text-[9px] font-black text-yellow-400 uppercase">Override</span>
														{:else}
															<span class="text-[10px] font-black text-blue-500 uppercase">{(gf.winProb > 0.5 ? gf.winProb : 1-gf.winProb).toLocaleString(undefined, {style: 'percent'})} Win</span>
														{/if}
													</div>
													<div class="space-y-1">
														<div class="flex justify-between {gf.winner === gf.a1 ? 'text-white font-black' : 'text-zinc-500'}">
															<span>A{gfA1} <span class="text-zinc-600 font-normal">{gf.a1?.captain}</span></span>
															<span>{gf.played ? gf.redScore : gf.epa1.toFixed(0)}</span>
														</div>
														<div class="flex justify-between {gf.winner === gf.a2 ? 'text-white font-black' : 'text-zinc-500'}">
															<span>A{gfA2} <span class="text-zinc-600 font-normal">{gf.a2?.captain}</span></span>
															<span>{gf.played ? gf.blueScore : gf.epa2.toFixed(0)}</span>
														</div>
													</div>
												</button>

												<!-- Champion Card -->
												<div class="bg-orange-500/10 border-2 border-orange-500/40 rounded-2xl p-6 text-center shadow-[0_0_30px_rgba(249,115,22,0.1)] relative overflow-hidden group">
													<div class="absolute -right-4 -top-4 text-6xl opacity-10 group-hover:scale-110 transition-transform duration-700">🏆</div>
													<p class="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2">{gf.played ? 'Champion' : 'Predicted Champion'}</p>
													<h4 class="text-4xl font-black text-white mb-1">Alliance {effectiveAlliances.indexOf(gf.winner) + 1}</h4>
													<p class="text-sm font-bold text-zinc-400">
														{gf.winner?.captain}{#each gf.winner?.picks || [] as p}, {p}{/each}
														{#if gf.winner?.backup}<span class="text-yellow-400 text-[9px]"> ({gf.winner.backup.in} B)</span>{/if}
													</p>
													{#if !gf.played}
														<p class="text-xs font-bold text-zinc-500 mt-1">{(gf.winProb > 0.5 ? gf.winProb : 1-gf.winProb).toLocaleString(undefined, {style: 'percent'})} confidence</p>
													{/if}
												</div>
											{/each}
										</div>
									</div>
								</div>
							{/if}
						{:else}
							<div class="p-12 text-center bg-black/20 rounded-[2rem] border-2 border-zinc-800 border-dashed">
								<p class="text-zinc-600 font-black uppercase tracking-[0.2em]">Rankings data required for simulation</p>
							</div>
						{/if}
					</div>
				</details>

			</div>


    {:else if overviewMode}
			<div class="animate-in fade-in slide-in-from-top-4 mb-12">
				<div class="flex flex-col md:flex-row gap-8">
					<!-- Team Selector & Info -->
					<div class="w-full md:w-80 flex-shrink-0">
						<div class="bg-zinc-900/40 border-2 border-purple-500/20 rounded-3xl p-6 backdrop-blur-xl shadow-2xl sticky top-4">
							<h3 class="text-xl font-black text-purple-400 uppercase italic tracking-tighter mb-4">Team Focus</h3>
							<div class="relative mb-4">
								<input
									type="text"
									bind:value={overviewTeam}
									placeholder="Enter Team # or leave blank for all..."
									class="w-full bg-black/40 border-2 border-zinc-800 rounded-xl p-4 font-black text-white focus:border-purple-500 outline-none transition uppercase"
								/>
							</div>

							<!-- Data View Toggle -->
							<div class="flex rounded-xl overflow-hidden border-2 border-zinc-800 mb-4">
								<button on:click={() => overviewDataView = false} class="flex-1 py-2 text-[9px] font-black uppercase tracking-widest transition {!overviewDataView ? 'bg-purple-600 text-white' : 'bg-black/40 text-zinc-500 hover:text-white'}">Schedule</button>
								<button on:click={() => overviewDataView = true} class="flex-1 py-2 text-[9px] font-black uppercase tracking-widest transition {overviewDataView ? 'bg-purple-600 text-white' : 'bg-black/40 text-zinc-500 hover:text-white'}">Data View</button>
							</div>

							{#if overviewTeam}
								{@const details = teamDetailsMap.get(overviewTeam)}
								{@const stats = teamStatsMap.get(overviewTeam)}
								{@const opr = eventOprs?.[`frc${overviewTeam}`] || 0}
								<div class="space-y-4">
									<div class="p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl">
										<p class="text-3xl font-black text-white">{overviewTeam}</p>
										<p class="text-xs font-black text-zinc-500 uppercase tracking-widest truncate">{details?.nickname || 'Unknown Team'}</p>
									</div>

									{#if overviewDataView && stats}
										{@const eventRank = eventRankings.find(r => r.team_key === `frc${overviewTeam}`)?.rank}
										<!-- Team Performance Stats -->
										<div class="space-y-2">
											<div class="grid grid-cols-2 gap-2">
												<div class="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
													<p class="text-[8px] font-black text-blue-400 uppercase tracking-widest">EPA</p>
													<p class="text-xl font-black text-white">{stats.epa.toFixed(1)}</p>
												</div>
												<div class="p-3 bg-green-500/5 border border-green-500/20 rounded-xl">
													<p class="text-[8px] font-black text-green-400 uppercase tracking-widest">OPR</p>
													<p class="text-xl font-black text-white">{opr.toFixed(1)}</p>
												</div>
											</div>
											{#each [overviewTeamSchedule.filter(m2 => m2.isPlayed)] as wl}
												{@const wins = wl.filter(m2 => {
													const rs = m2.alliances?.red?.score ?? 0;
													const bs = m2.alliances?.blue?.score ?? 0;
													return (m2.alliance === 'red' && rs > bs) || (m2.alliance === 'blue' && bs > rs);
												}).length}
												<div class="grid grid-cols-2 gap-2">
													<div class="p-3 bg-orange-500/5 border border-orange-500/20 rounded-xl">
														<p class="text-[8px] font-black text-orange-400 uppercase tracking-widest">Event Rank</p>
														<p class="text-xl font-black text-white">{eventRank ? `#${eventRank}` : '—'}</p>
													</div>
													<div class="p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl">
														<p class="text-[8px] font-black text-purple-400 uppercase tracking-widest">Record</p>
														<p class="text-xl font-black text-white">{wins}-{wl.length - wins}</p>
													</div>
												</div>
											{/each}
											<div class="p-3 bg-zinc-800/50 border border-zinc-700 rounded-xl">
												<p class="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-2">RP Rates</p>
												<div class="grid grid-cols-3 gap-2 text-center">
													<div>
														<p class="text-xs font-black text-white">{(stats.rp1 || 0).toFixed(2)}</p>
														<p class="text-[7px] text-zinc-500 font-bold">RP1</p>
													</div>
													<div>
														<p class="text-xs font-black text-white">{(stats.rp2 || 0).toFixed(2)}</p>
														<p class="text-[7px] text-zinc-500 font-bold">RP2</p>
													</div>
													<div>
														<p class="text-xs font-black text-white">{(stats.rp3 || 0).toFixed(2)}</p>
														<p class="text-[7px] text-zinc-500 font-bold">RP3</p>
													</div>
												</div>
											</div>
											{#each [computeEventSOS()] as sosMap}
												{#if sosMap.size > 0 && sosMap.has(overviewTeam)}
													{@const sos = sosMap.get(overviewTeam)}
													<button
														on:click={() => showSosLeaderboard = true}
														class="w-full p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-xl text-left hover:border-cyan-500/40 transition-all group">
														<div class="flex items-center justify-between mb-1">
															<p class="text-[8px] font-black text-cyan-400 uppercase tracking-widest">Strength of Schedule</p>
															<span class="text-[7px] font-bold text-zinc-600 group-hover:text-cyan-400 transition">View All →</span>
														</div>
														<div class="flex items-baseline gap-2">
															<p class="text-xl font-black text-white">{sos.sosValue >= 0 ? '+' : ''}{sos.sosValue.toFixed(1)}</p>
															<p class="text-[10px] font-bold text-cyan-400/70">{sos.rank}{sos.rank === 1 ? 'st' : sos.rank === 2 ? 'nd' : sos.rank === 3 ? 'rd' : 'th'} hardest of {sosMap.size}</p>
														</div>
														<div class="grid grid-cols-2 gap-2 mt-2 text-center">
															<div>
																<p class="text-[10px] font-black text-white">{sos.avgOppEpa.toFixed(1)}</p>
																<p class="text-[7px] text-zinc-500 font-bold">Avg Opp EPA</p>
															</div>
															<div>
																<p class="text-[10px] font-black text-white">{sos.avgPartnerEpa.toFixed(1)}</p>
																<p class="text-[7px] text-zinc-500 font-bold">Avg Partner EPA</p>
															</div>
														</div>
													</button>
												{/if}
											{/each}
											{#each [getTeamWarnings(overviewTeam)] as teamWarn}
												{#if teamWarn.cardCount > 0 || teamWarn.diedCount > 0 || teamWarn.mechCount > 0 || teamWarn.tippedCount > 0}
													<div class="p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
														<p class="text-[8px] font-black text-red-400 uppercase tracking-widest mb-1">Issues</p>
														<div class="space-y-0.5 text-[10px] text-red-300">
															{#if teamWarn.cardCount > 0}<p>{teamWarn.hasRed ? 'Red' : 'Yellow'} carded ({teamWarn.cardCount}x)</p>{/if}
															{#if teamWarn.diedCount > 0}<p>Died in {teamWarn.diedCount} match{teamWarn.diedCount > 1 ? 'es' : ''}</p>{/if}
															{#if teamWarn.mechCount > 0}<p>Mech issue in {teamWarn.mechCount} match{teamWarn.mechCount > 1 ? 'es' : ''}</p>{/if}
															{#if teamWarn.tippedCount > 0}<p>Tipped in {teamWarn.tippedCount} match{teamWarn.tippedCount > 1 ? 'es' : ''}</p>{/if}
														</div>
													</div>
												{/if}
											{/each}
											{#each [getOverviewTrendData(overviewTeam)] as trendData}
												{#if trendData}
													<div class="p-3 bg-zinc-800/50 border border-zinc-700 rounded-xl">
														<p class="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-2">Performance Trends</p>
														<div class="h-48">
															<Line data={{ labels: trendData.labels, datasets: trendData.datasets }} options={trendData.options} />
														</div>
													</div>
												{/if}
											{/each}
										</div>
									{/if}
								</div>
							{/if}
						</div>
					</div>

					<!-- Schedule & Status -->
					<div class="flex-1">
						{#if overviewTeamSchedule.length === 0}
							<div class="h-64 flex flex-col items-center justify-center bg-zinc-900/20 rounded-[2.5rem] border-2 border-zinc-800 border-dashed">
								<p class="text-zinc-600 font-black uppercase tracking-[0.2em]">{overviewTeam ? `No matches found for Team ${overviewTeam}` : 'No schedule data available'}</p>
							</div>
						{:else}
							{#if !overviewTeam}
								<p class="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Full Event Schedule ({overviewTeamSchedule.length} matches)</p>
							{/if}
							<div class="grid grid-cols-1 gap-4">
								{#each overviewTeamSchedule as m}
									{@const pred = overviewDataView ? getOverviewMatchPrediction(m) : null}
									{@const allianceBorder = m.alliance === 'red' ? 'border-red-500/20 hover:border-red-500/40' : m.alliance === 'blue' ? 'border-blue-500/20 hover:border-blue-500/40' : 'border-zinc-700 hover:border-zinc-600'}
									<div
										class="group bg-zinc-900/40 border-2 {allianceBorder} rounded-[2rem] p-6 backdrop-blur-xl shadow-xl transition-all relative overflow-hidden">

										<div class="flex flex-col md:flex-row justify-between items-start gap-6 relative z-10">
											<div class="flex items-start gap-6 flex-1">
												<div class="w-20 h-20 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 {m.alliance === 'red' ? 'bg-red-500/10 border-2 border-red-500/20' : m.alliance === 'blue' ? 'bg-blue-500/10 border-2 border-blue-500/20' : 'bg-zinc-800 border-2 border-zinc-700'}">
													<p class="text-[10px] font-black {m.alliance === 'red' ? 'text-red-500' : m.alliance === 'blue' ? 'text-blue-500' : 'text-zinc-400'} uppercase">{m.isPlayoff ? m.playoffLabel || m.match_number : 'Match'}</p>
													<p class="text-3xl font-black text-white">{m.isPlayoff ? '' : m.match_number}</p>
												</div>
												<div class="flex-1">
													<div class="flex items-center gap-3 mb-3">
														{#if m.isPlayoff}
															<span class="text-[10px] font-black text-orange-400 uppercase tracking-widest">Playoff</span>
														{/if}
														{#if m.isPlayed}
															<span class="text-[10px] font-black text-green-500 uppercase tracking-widest flex items-center gap-1">
																<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" /></svg>
																Played
															</span>
															{#if pred}
																<span class="text-[10px] font-black text-zinc-400">{pred.redScore} - {pred.blueScore}</span>
															{/if}
														{:else}
															<span class="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Upcoming</span>
															{#if pred}
																<span class="text-[10px] font-bold {pred.winProb > 0.5 ? 'text-red-400' : 'text-blue-400'}">{(Math.max(pred.winProb, 1 - pred.winProb) * 100).toFixed(0)}% {pred.winProb > 0.5 ? 'Red' : 'Blue'}</span>
															{/if}
														{/if}
													</div>

													{#if m.time || m.predicted_time}
														<div class="flex items-center gap-3 mb-3 text-[10px] text-zinc-500">
															{#if m.time}
																<span class="flex items-center gap-1">
																	<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
																	<span class="font-bold">Scheduled:</span> {formatMatchTime(m.time)}
																</span>
															{/if}
															{#if m.predicted_time && m.predicted_time !== m.time}
																<span class="flex items-center gap-1 {m.predicted_time > m.time ? 'text-yellow-500/70' : 'text-zinc-500'}">
																	<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
																	<span class="font-bold">Predicted:</span> {formatMatchTime(m.predicted_time)}
																</span>
															{/if}
														</div>
													{/if}
													<div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
														<div>
															<p class="text-[8px] font-black text-red-500/60 uppercase tracking-widest mb-1.5">Red Alliance {pred ? `(${pred.redEpa.toFixed(0)} EPA)` : ''}</p>
															<div class="grid grid-cols-3 gap-2">
																{#each (m.alliances?.red?.team_keys || []) as key}
																	{@const tNum = key.replace('frc', '')}
																	<button
																		on:click|stopPropagation={() => { overviewTeam = tNum; }}
																		class="px-3 py-1.5 rounded-lg text-sm font-black {tNum === overviewTeam ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-black/40 text-zinc-300 hover:bg-zinc-800 hover:text-white border-white/5'} border transition-all text-center whitespace-nowrap">
																		{tNum}
																	</button>
																{/each}
															</div>
														</div>
														<div>
															<p class="text-[8px] font-black text-blue-500/60 uppercase tracking-widest mb-1.5">Blue Alliance {pred ? `(${pred.blueEpa.toFixed(0)} EPA)` : ''}</p>
															<div class="grid grid-cols-3 gap-2">
																{#each (m.alliances?.blue?.team_keys || []) as key}
																	{@const tNum = key.replace('frc', '')}
																	<button
																		on:click|stopPropagation={() => { overviewTeam = tNum; }}
																		class="px-3 py-1.5 rounded-lg text-sm font-black {tNum === overviewTeam ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-black/40 text-zinc-300 hover:bg-zinc-800 hover:text-white border-white/5'} border transition-all text-center whitespace-nowrap">
																		{tNum}
																	</button>
																{/each}
															</div>
														</div>
													</div>

													<!-- Data View: RP Cards & Warnings -->
													{#if overviewDataView && pred && m.alliances}
														<div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
															<div>
																<p class="text-[7px] font-black text-red-500/50 uppercase tracking-widest mb-1">Red RP Projection</p>
																<RPCards alliance="red" predictions={pred.rpRed} />
															</div>
															<div>
																<p class="text-[7px] font-black text-blue-500/50 uppercase tracking-widest mb-1">Blue RP Projection</p>
																<RPCards alliance="blue" predictions={pred.rpBlue} />
															</div>
														</div>

														<!-- Win Probability Bar -->
														{#if !pred.played}
															<div class="mt-2 mb-1">
																<div class="flex h-2 rounded-full overflow-hidden">
																	<div class="bg-red-500 transition-all" style="width: {pred.winProb * 100}%"></div>
																	<div class="bg-blue-500 transition-all" style="width: {(1 - pred.winProb) * 100}%"></div>
																</div>
															</div>
														{/if}

														<!-- Alliance Partner Warnings -->
														{#if overviewTeam}
															{@const allianceKeys = m.alliance === 'red' ? (m.alliances.red?.team_keys || []) : (m.alliances.blue?.team_keys || [])}
															{@const partnerWarnings = allianceKeys.map(k => ({ team: k.replace('frc', ''), warnings: getTeamWarnings(k.replace('frc', '')) })).filter(pw => pw.team !== overviewTeam && (pw.warnings.cardCount > 0 || pw.warnings.diedCount > 0 || pw.warnings.mechCount > 0 || pw.warnings.tippedCount > 0))}
															{#if partnerWarnings.length > 0}
																<div class="mt-3 space-y-1.5">
																	{#each partnerWarnings as pw}
																		<div class="flex items-start gap-2 text-[10px] bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-3 py-2">
																			<span class="text-yellow-400 flex-shrink-0">⚠</span>
																			<div class="text-yellow-300/90">
																				{#if pw.warnings.cardCount > 0}
																					<p><span class="font-black">Team {pw.team}</span> has been {pw.warnings.hasRed ? 'red' : 'yellow'} carded during quals</p>
																				{/if}
																				{#if pw.warnings.diedCount > 0}
																					<p><span class="font-black">Team {pw.team}</span> has died in {pw.warnings.diedCount} previous match{pw.warnings.diedCount > 1 ? 'es' : ''}</p>
																				{/if}
																				{#if pw.warnings.mechCount > 0}
																					<p><span class="font-black">Team {pw.team}</span> has broken down in {pw.warnings.mechCount} previous match{pw.warnings.mechCount > 1 ? 'es' : ''}</p>
																				{/if}
																				{#if pw.warnings.tippedCount > 0}
																					<p><span class="font-black">Team {pw.team}</span> has tipped in {pw.warnings.tippedCount} previous match{pw.warnings.tippedCount > 1 ? 'es' : ''}</p>
																				{/if}
																			</div>
																		</div>
																	{/each}
																</div>
															{/if}
														{/if}
													{/if}
												</div>
											</div>

											<div class="flex flex-col items-end gap-3 flex-shrink-0">
												{#if !m.isPlayoff}
													<button
														on:click|stopPropagation={() => loadMatchIntoSimulator(m)}
														class="bg-zinc-800 hover:bg-purple-600 text-white text-[10px] font-black px-6 py-3 rounded-xl transition-all uppercase tracking-[0.2em] shadow-lg active:scale-95 border border-zinc-700">
														Simulate
													</button>
												{/if}
											</div>
										</div>
									</div>
									{#if m.swapNeeded}
										<div class="flex items-center justify-center gap-3 py-2">
											<div class="flex-1 border-t border-dashed border-orange-500/30"></div>
											<div class="flex items-center gap-2 text-orange-400 bg-orange-500/5 border border-orange-500/20 rounded-full px-4 py-1.5">
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
												<span class="text-[10px] font-black uppercase tracking-widest">Bumper Swap</span>
											</div>
											<div class="flex-1 border-t border-dashed border-orange-500/30"></div>
										</div>
									{/if}
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
				<div class="bg-zinc-900/50 p-3 md:p-6 rounded-2xl md:rounded-3xl border border-zinc-800 shadow-xl"><p class="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-1">Scouted Entries</p><p class="text-2xl md:text-4xl font-black text-white">{scoutingData.length}</p></div>
				<div class="bg-zinc-900/50 p-3 md:p-6 rounded-2xl md:rounded-3xl border border-zinc-800 shadow-xl"><p class="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-1">Teams Ranked</p><p class="text-2xl md:text-4xl font-black text-white">{teamMetrics.length}</p></div>
				<div class="bg-blue-600/10 p-3 md:p-6 rounded-2xl md:rounded-3xl border-2 border-blue-500/30 shadow-xl group hover:border-blue-500 transition-colors"><p class="text-[8px] md:text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1">Top EPA Power</p><p class="text-2xl md:text-4xl font-black text-white">{[...teamMetrics].sort((a,b) => b.epa - a.epa)[0]?.teamNum || 'N/A'} <span class="text-[7px] md:text-xs font-black text-blue-400/60 ml-1">({([...teamMetrics].sort((a,b) => b.epa - a.epa)[0]?.epa || 0).toFixed(1)})</span></p></div>
				<div class="bg-purple-600/10 p-3 md:p-6 rounded-2xl md:rounded-3xl border-2 border-purple-500/30 shadow-xl group hover:border-purple-500 transition-colors"><p class="text-[8px] md:text-[10px] font-black text-purple-500 uppercase tracking-[0.2em] mb-1">Best Climber</p><p class="text-2xl md:text-4xl font-black text-white">{[...teamMetrics].sort((a,b) => b.climbRate - a.climbRate)[0]?.teamNum || 'N/A'} <span class="text-[7px] md:text-xs font-black text-purple-400/60 ml-1">({(([...teamMetrics].sort((a,b) => b.climbRate - a.climbRate)[0]?.climbRate || 0) * 100).toFixed(0)}%)</span></p></div>
			</div>

			<div class="overflow-x-auto bg-zinc-900/20 rounded-[2rem] border-2 border-zinc-800 shadow-2xl backdrop-blur-xl">
				<table class="w-full text-left border-separate border-spacing-0">
					<thead>
						<tr class="bg-zinc-800/40 text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em]">
							<th class="p-6 border-b-2 border-zinc-800 rounded-tl-[2rem] cursor-pointer hover:text-white" on:click={() => handleSort('Team #')}>Team {sortKey === 'Team #' ? (sortOrder === 1 ? '↑' : '↓') : ''}</th>
							<th class="p-6 border-b-2 border-zinc-800 cursor-pointer hover:text-white" on:click={() => handleSort('Match #')}>Match {sortKey === 'Match #' ? (sortOrder === 1 ? '↑' : '↓') : ''}</th>
							<th class="p-6 border-b-2 border-zinc-800 cursor-pointer hover:text-white" on:click={() => handleSort('EPA')}>EPA (Statbotics) {sortKey === 'EPA' ? (sortOrder === 1 ? '↑' : '↓') : ''}</th>
							<th class="p-6 border-b-2 border-zinc-800 cursor-pointer hover:text-white" on:click={() => handleSort('OPR')}>OPR (TBA) {sortKey === 'OPR' ? (sortOrder === 1 ? '↑' : '↓') : ''}</th>
							<th class="p-6 border-b-2 border-zinc-800 text-center cursor-pointer hover:text-white" on:click={() => handleSort('Climb Rate')}>Climb Rate {sortKey === 'Climb Rate' ? (sortOrder === 1 ? '↑' : '↓') : ''}</th>
							<th class="p-6 border-b-2 border-zinc-800 text-center cursor-pointer hover:text-white" on:click={() => handleSort('Scout Eff.')}>Scout Eff. {sortKey === 'Scout Eff.' ? (sortOrder === 1 ? '↑' : '↓') : ''}</th>
							<th class="p-6 border-b-2 border-zinc-800 rounded-tr-[2rem]">Scouter</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-zinc-800">
						{#each filteredData as row}
							{@const metrics = teamMetrics.find(m => m.teamNum === getVal(row, 'Team #'))}
							{@const hasCard = getVal(row, 'card') && getVal(row, 'card') !== 'No' && getVal(row, 'card') !== 'No Card'}
							<tr class="hover:bg-blue-600/10 transition-all duration-300 cursor-pointer group {hasCard ? 'border-l-4 border-l-yellow-500' : ''}" on:click={() => handleRowClick(row)}>
								<td class="p-6 font-black text-blue-400 group-hover:pl-10 transition-all">
									<div class="text-2xl">{getVal(row, 'Team #')}</div>
									{#if teamDetailsMap.get(getVal(row, 'Team #'))}
										<div class="text-sm text-zinc-500 font-bold truncate">
											{teamDetailsMap.get(getVal(row, 'Team #')).nickname}
											<br/>
											<span class="text-xs opacity-60 italic">{teamDetailsMap.get(getVal(row, 'Team #')).city}, {teamDetailsMap.get(getVal(row, 'Team #')).state_prov}</span>
										</div>
									{/if}
								</td>
								<td class="p-6 font-mono text-sm text-zinc-300">M{getVal(row, 'Match #')}</td>
								<td class="p-6"><span class="text-xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">{metrics?.epa.toFixed(1) || '...'}</span></td>
								<td class="p-6"><span class="text-xl font-black text-zinc-400">{metrics?.opr.toFixed(1) || '...'}</span></td>
								<td class="p-6 text-center"><span class="text-lg font-black {metrics?.climbRate > 0.7 ? 'text-purple-400' : 'text-zinc-600'}">{(metrics?.climbRate * 100).toFixed(0)}%</span></td>
								<td class="p-6 text-center"><span class="text-lg font-black text-orange-400 bg-orange-400/10 px-3 py-1 rounded-xl">{parseFloat(getVal(row, 'Scoring effectiveness?')).toFixed(1)}</span></td>
								<td class="p-6 text-[10px] text-zinc-600 font-black uppercase tracking-widest">{getVal(row, 'Scouter initials')}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

{#if selectedRow}
	{@const colors = teamColorsMap.get(getVal(selectedRow, 'Team #')) || { primary: '#3b82f6', secondary: '#1e40af' }}
	<div class="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-2 md:p-4 bg-black/30 backdrop-blur-lg animate-in fade-in zoom-in-95 duration-200" 
		style="--team-primary: {colors.primary}; --team-secondary: {colors.secondary}"
		role="button"
		tabindex="0"
		on:click|self={() => selectedRow = null}
		on:keydown={(e) => e.key === 'Escape' && (selectedRow = null)}>
		<div class="bg-[#0a0a0a] border-2 border-zinc-800 rounded-t-[2rem] md:rounded-[3rem] w-full md:max-w-5xl max-h-[90vh] md:max-h-[95vh] overflow-y-auto shadow-[0_0_150px_rgba(0,0,0,1)]">
			<!-- Header -->
			<div class="sticky top-0 bg-[#0a0a0a]/90 backdrop-blur-md p-3 md:p-10 border-b-2 border-zinc-800 flex flex-col md:flex-row md:justify-between md:items-center gap-3 z-10">
				<div class="flex-1 min-w-0">
					<div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2 md:mb-0">
						<h2 class="text-2xl md:text-6xl font-black uppercase tracking-tighter break-words" style="color: var(--team-primary)">Team {getVal(selectedRow, 'Team #')}</h2>
						{#if selectedTeamMatches.length > 1}
							<select 
								on:change={(e) => selectTeamMatch(selectedTeamMatches[e.target.selectedIndex])}
								value={getVal(selectedRow, 'Match #')}
								class="bg-zinc-900 border-2 border-zinc-700 rounded-lg md:rounded-xl px-2 md:px-4 py-1 md:py-2 text-xs md:text-sm font-black uppercase tracking-widest text-white hover:border-blue-500 focus:border-blue-500 outline-none transition cursor-pointer flex-shrink-0">
								{#each selectedTeamMatches as matchRow}
									<option value={getVal(matchRow, 'Match #')} selected={getVal(matchRow, 'Match #') === getVal(selectedRow, 'Match #')}>
										Match {getVal(matchRow, 'Match #')}
									</option>
								{/each}
							</select>
						{/if}
					</div>
					<div class="flex flex-col gap-1">
						{#if teamStats}<p class="text-sm md:text-lg text-zinc-400 font-black uppercase tracking-widest">{teamStats.nickname} • {teamStats.city}, {teamStats.state}</p>{/if}
						{#if teamStats?.pit && getVal(teamStats.pit, 'Drive Coach') && getVal(teamStats.pit, 'Drive Coach') !== 'N/A'}
							<p class="text-[10px] md:text-sm text-blue-500 font-black uppercase tracking-widest flex items-center gap-2">
								<span class="text-zinc-600">Drive Coach:</span> {getVal(teamStats.pit, 'Drive Coach')}
							</p>
						{/if}
						{#if teamStats?.pit && getVal(teamStats.pit, 'Team Friendliness') && getVal(teamStats.pit, 'Team Friendliness') !== 'N/A'}
							<p class="text-[10px] md:text-sm text-green-500 font-black uppercase tracking-widest flex items-center gap-2">
								<span class="text-zinc-600">Friendliness:</span> {getVal(teamStats.pit, 'Team Friendliness')}
							</p>
						{/if}
						<p class="text-[10px] md:text-xs text-zinc-600 uppercase font-black tracking-[0.2em] md:tracking-[0.4em]">Match {getVal(selectedRow, 'Match #')} • Scout: {getVal(selectedRow, 'Scouter initials')}</p>
					</div>
				</div>
				<div class="flex gap-2 flex-shrink-0">
					<button on:click={() => { const t = getVal(selectedRow, 'Team #'); if (simRedTeams.includes(t) || simBlueTeams.includes(t)) return; if (simRedTeams.includes('')) simRedTeams[simRedTeams.indexOf('')] = t; else if (simBlueTeams.includes('')) simBlueTeams[simBlueTeams.indexOf('')] = t; simulatorMode = true; selectionMode = false; pitMode = false; }} 
						class="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] bg-white/5 border-2 border-white/10 text-white/60 px-3 md:px-6 py-1 md:py-2 rounded-full hover:bg-white hover:text-black transition shadow-lg active:scale-95 whitespace-nowrap">
						+ Simulator
					</button>
					<button on:click={() => selectedRow = null} class="w-10 h-10 md:w-16 md:h-16 flex items-center justify-center bg-zinc-900 hover:bg-red-600 rounded-lg md:rounded-[1.5rem] transition text-zinc-400 hover:text-white shadow-2xl group flex-shrink-0"><span class="text-xl md:text-3xl group-hover:rotate-90 transition-transform duration-300">✕</span></button>
				</div>
			</div>
			
			<!-- Content -->
			<div class="p-3 md:p-10 space-y-6 md:space-y-12">
				<!-- Comments Dropdown -->
				<details class="group/comments bg-zinc-900/40 border-2 border-zinc-800 rounded-[2rem] overflow-hidden shadow-xl">
					<summary class="p-6 md:p-8 cursor-pointer list-none flex items-center justify-between hover:bg-white/5 transition-colors">
						<div class="flex items-center gap-4">
							<div class="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
								<svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
							</div>
							<h3 class="text-xl md:text-2xl font-black text-white uppercase tracking-tighter">Field Observations</h3>
						</div>
						<svg class="w-6 h-6 text-zinc-500 group-open/comments:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" /></svg>
					</summary>
					<div class="p-6 md:p-8 border-t border-zinc-800/50 space-y-4">
						{#each selectedTeamMatches as matchRow}
							{@const comment = getVal(matchRow, 'comments')}
							{#if comment && comment !== 'N/A'}
								<div class="bg-zinc-900/60 p-4 md:p-6 rounded-2xl border-l-4 border-blue-600 shadow-xl backdrop-blur-sm group hover:border-blue-500 transition-all">
									<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
										<div class="flex items-center gap-3">
											<span class="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20">Match {getVal(matchRow, 'Match #')}</span>
											<span class="text-[8px] font-black text-zinc-600 uppercase">Scout: {getVal(matchRow, 'Scouter initials')}</span>
										</div>
										<button 
											on:click={() => selectTeamMatch(matchRow)}
											class="text-[8px] font-black uppercase tracking-widest bg-zinc-800 hover:bg-blue-600 text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg transition active:scale-95">
											Jump to Match
										</button>
									</div>
									<p class="font-black text-zinc-200 text-base md:text-lg leading-relaxed italic tracking-tight italic">"{comment}"</p>
								</div>
							{/if}
						{/each}
						{#if selectedTeamMatches.filter(m => getVal(m, 'comments') && getVal(m, 'comments') !== 'N/A').length === 0}
							<div class="py-12 text-center">
								<p class="text-zinc-600 font-black uppercase tracking-widest italic">No direct observations recorded.</p>
							</div>
						{/if}
					</div>
				</details>

				{#if teamStats?.pit && getDriveDirectLink(getVal(teamStats.pit, 'Bot pic'))}
					<div class="w-full h-40 md:h-64 rounded-2xl md:rounded-[3rem] overflow-hidden border-2 border-zinc-800 shadow-2xl relative group bg-black/40 cursor-zoom-in hover:border-blue-500 transition-colors"
						role="button"
						tabindex="0"
						on:click={() => openImageViewer(getDriveDirectLink(getVal(teamStats.pit, 'Bot pic')))}
						on:keydown={(e) => e.key === 'Enter' && openImageViewer(getDriveDirectLink(getVal(teamStats.pit, 'Bot pic')))}>
						<img src={getDriveDirectLink(getVal(teamStats.pit, 'Bot pic'))} alt="Bot pic" class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700" />
						<div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3 md:p-8"><p class="text-[10px] md:text-xs font-black text-white uppercase tracking-[0.3em] md:tracking-[0.5em]">Tactical Visual Confirmed</p></div>
						<div class="absolute top-2 md:top-5 right-2 md:right-5 bg-black/60 text-white text-xs md:text-sm font-black px-2 md:px-4 py-1 md:py-2 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
							🔍 Click to zoom
						</div>
					</div>
				{/if}
				
				{#if !pitMode}
					<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-8">
						<div class="bg-blue-600/5 border-2 {teamStats?.epa !== undefined ? 'border-blue-500/20 hover:border-blue-500' : 'border-red-500/30'} p-4 md:p-8 rounded-xl md:rounded-[2rem] shadow-xl group transition-all duration-500">
							<p class="text-[8px] md:text-[10px] font-black {teamStats?.epa !== undefined ? 'text-blue-500' : 'text-red-500'} uppercase tracking-[0.2em] md:tracking-[0.3em] mb-2 md:mb-3">Predicted Power (EPA)</p>
							{#if teamStats?.epa !== undefined}
								<p class="text-xl md:text-5xl font-black text-white">{teamStats.epa.toFixed(1)}</p>
							{:else}
								<p class="text-3xl md:text-5xl font-black text-red-500/40">✕</p>
								<p class="text-[10px] font-black text-red-400/60 mt-2">Loading...</p>
							{/if}
						</div>
						<div class="bg-purple-600/5 border-2 {teamStats?.rank !== undefined ? 'border-purple-500/20 hover:border-purple-500' : 'border-red-500/30'} p-4 md:p-8 rounded-xl md:rounded-[2rem] shadow-xl group transition-all duration-500">
							<p class="text-[8px] md:text-[10px] font-black {teamStats?.rank !== undefined ? 'text-purple-500' : 'text-red-500'} uppercase tracking-[0.2em] md:tracking-[0.3em] mb-2 md:mb-3">Unitless Global Rank</p>
							{#if teamStats?.rank !== undefined}
								<p class="text-xl md:text-5xl font-black text-white">{teamStats.rank}</p>
							{:else}
								<p class="text-3xl md:text-5xl font-black text-red-500/40">✕</p>
								<p class="text-[10px] font-black text-red-400/60 mt-2">Loading...</p>
							{/if}
						</div>
						<div class="bg-orange-600/5 border-2 {teamStats?.opr !== undefined ? 'border-orange-500/20 hover:border-orange-500' : 'border-red-500/30'} p-4 md:p-8 rounded-xl md:rounded-[2rem] shadow-xl group transition-all duration-500">
							<p class="text-[8px] md:text-[10px] font-black {teamStats?.opr !== undefined ? 'text-orange-500' : 'text-red-500'} uppercase tracking-[0.2em] md:tracking-[0.3em] mb-2 md:mb-3">Event OPR (TBA)</p>
							{#if teamStats?.opr !== undefined}
								<p class="text-xl md:text-5xl font-black text-white">{teamStats.opr.toFixed(1)}</p>
							{:else}
								<p class="text-3xl md:text-5xl font-black text-red-500/40">✕</p>
								<p class="text-[10px] font-black text-red-400/60 mt-2">Loading...</p>
							{/if}
						</div>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-8">
						<div class="bg-green-600/5 border-2 {teamStats?.autoWinPercent !== undefined ? 'border-green-500/20 hover:border-green-500' : 'border-red-500/30'} p-4 md:p-8 rounded-xl md:rounded-[2rem] shadow-xl group transition-all duration-500">
							<p class="text-[8px] md:text-[10px] font-black {teamStats?.autoWinPercent !== undefined ? 'text-green-500' : 'text-red-500'} uppercase tracking-[0.2em] md:tracking-[0.3em] mb-2 md:mb-3">Auto Win Rate</p>
							{#if teamStats?.autoWinPercent !== undefined}
								<p class="text-xl md:text-5xl font-black text-white">{teamStats.autoWinPercent.toFixed(0)}%</p>
							{:else}
								<p class="text-3xl md:text-5xl font-black text-red-500/40">✕</p>
								<p class="text-[10px] font-black text-red-400/60 mt-2">Loading...</p>
							{/if}
						</div>
						<div class="bg-cyan-600/5 border-2 {teamStats?.scoreHow ? 'border-cyan-500/20 hover:border-cyan-500' : 'border-red-500/30'} p-4 md:p-8 rounded-xl md:rounded-[2rem] shadow-xl group transition-all duration-500">
							<p class="text-[8px] md:text-[10px] font-black {teamStats?.scoreHow ? 'text-cyan-500' : 'text-red-500'} uppercase tracking-[0.2em] md:tracking-[0.3em] mb-2 md:mb-3">Primary Scoring Method</p>
							{#if teamStats?.scoreHow && teamStats.scoreHow !== 'N/A'}
								<p class="text-sm md:text-lg font-black text-white break-words line-clamp-3">{teamStats.scoreHow}</p>
							{:else if teamStats?.scoreHow}
								<p class="text-3xl md:text-5xl font-black text-red-500/40">✕</p>
								<p class="text-[10px] font-black text-red-400/60 mt-2">No Data</p>
							{:else}
								<p class="text-3xl md:text-5xl font-black text-red-500/40">✕</p>
								<p class="text-[10px] font-black text-red-400/60 mt-2">Loading...</p>
							{/if}
						</div>
					</div>
				{/if}

				{#if teamStats?.pit}
					<section>
						<div class="flex items-center gap-3 md:gap-6 mb-4 md:mb-8">
							<h3 class="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] md:tracking-[0.5em] whitespace-nowrap">Pit Intelligence</h3>
							<div class="h-0.5 flex-1 bg-gradient-to-r from-zinc-800 to-transparent"></div>
						</div>
						<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
							<div class="bg-zinc-900/60 p-3 md:p-6 rounded-lg md:rounded-2xl border border-zinc-800">
								<p class="text-[7px] md:text-[8px] font-black text-zinc-500 uppercase mb-0.5 md:mb-1">Drive Train</p>
								<p class="text-sm md:text-lg font-black text-white">{getVal(teamStats.pit, 'Drive Train Type')}</p>
								<p class="text-[8px] md:text-[10px] text-zinc-500">{getVal(teamStats.pit, 'Swerve Gearing')}</p>
							</div>
							<div class="bg-zinc-900/60 p-3 md:p-6 rounded-lg md:rounded-2xl border border-zinc-800">
								<p class="text-[7px] md:text-[8px] font-black text-zinc-500 uppercase mb-0.5 md:mb-1">Dimensions / Weight</p>
								<p class="text-sm md:text-lg font-black text-white truncate">{getVal(teamStats.pit, 'Frame dimensions')}</p>
								<p class="text-[8px] md:text-[10px] text-zinc-500">{getVal(teamStats.pit, 'Weight')} lbs</p>
							</div>
							<div class="bg-zinc-900/60 p-3 md:p-6 rounded-lg md:rounded-2xl border border-zinc-800">
								<p class="text-[7px] md:text-[8px] font-black text-zinc-500 uppercase mb-0.5 md:mb-1">Capabilities</p>
								<div class="flex flex-wrap gap-1 mt-1">
									{#if getVal(teamStats.pit, 'Under trench?') === 'Yes'} <span class="bg-green-900/30 text-green-400 text-[7px] md:text-[8px] px-1.5 md:px-2 py-0.5 rounded font-black uppercase">Trench</span> {/if}
									{#if getVal(teamStats.pit, 'Over bump?') === 'Yes'} <span class="bg-blue-900/30 text-blue-400 text-[7px] md:text-[8px] px-1.5 md:px-2 py-0.5 rounded font-black uppercase">Bump</span> {/if}
								</div>
							</div>
							<div class="bg-zinc-900/60 p-3 md:p-6 rounded-lg md:rounded-2xl border border-zinc-800">
								<p class="text-[7px] md:text-[8px] font-black text-zinc-500 uppercase mb-0.5 md:mb-1">Drive Coach</p>
								<p class="text-sm md:text-lg font-black text-white">{getVal(teamStats.pit, 'Drive Coach')}</p>
							</div>
							<div class="bg-zinc-900/60 p-3 md:p-6 rounded-lg md:rounded-2xl border border-zinc-800">
								<p class="text-[7px] md:text-[8px] font-black text-zinc-500 uppercase mb-0.5 md:mb-1">Friendliness</p>
								<p class="text-sm md:text-lg font-black text-white">{getVal(teamStats.pit, 'Team Friendliness')}</p>
							</div>
							<div class="bg-zinc-900/60 p-3 md:p-6 rounded-lg md:rounded-2xl border border-zinc-800">
								<p class="text-[7px] md:text-[8px] font-black text-zinc-500 uppercase mb-0.5 md:mb-1">Best Auto</p>
								<p class="text-[8px] md:text-[10px] font-bold text-zinc-300 italic truncate">"{getVal(teamStats.pit, 'Best Auto')}"</p>
							</div>
						</div>
					</section>
				{/if}

				{#if !pitMode}
					<div class="bg-black/60 p-4 md:p-10 rounded-xl md:rounded-[3rem] border-2 {scoutingData.filter(r => getVal(r, 'Team #') === getVal(selectedRow, 'Team #')).length > 0 ? 'border-zinc-900' : 'border-red-500/30'} h-48 md:h-96 shadow-inner relative group overflow-hidden flex items-center justify-center">
						<div class="absolute top-2 md:top-6 left-3 md:left-10 text-[8px] md:text-[10px] font-black uppercase {scoutingData.filter(r => getVal(r, 'Team #') === getVal(selectedRow, 'Team #')).length > 0 ? 'text-zinc-700 group-hover:text-zinc-500' : 'text-red-600'} transition-colors tracking-widest z-10">Performance Velocity</div>
						{#if scoutingData.filter(r => getVal(r, 'Team #') === getVal(selectedRow, 'Team #')).length > 0}
							<Line data={getChartData(getVal(selectedRow, 'Team #'))} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 5, ticks: { color: '#3f3f46', font: { weight: 'black', size: 8 } }, grid: { color: '#18181b' } }, x: { ticks: { color: '#3f3f46', font: { weight: 'black', size: 8 } }, grid: { display: false } } }, plugins: { legend: { position: 'top', align: 'end', labels: { color: '#71717a', font: { weight: 'black', size: 8 }, usePointStyle: true, padding: 15 } } } }} />
						{:else}
							<div class="flex flex-col items-center">
								<p class="text-4xl font-black text-red-500/40">✕</p>
								<p class="text-[10px] font-black text-red-400/60 mt-2">No Match Data</p>
							</div>
						{/if}
					</div>

					{@const teamMatchesWithIssues = scoutingData.filter(r => getVal(r, 'Team #') === getVal(selectedRow, 'Team #')).filter(r => {
						const hasMechanical = getVal(r, 'mech issue') === 'TRUE' || getVal(r, 'mechanical issue') === 'Yes';
						const hasTipped = getVal(r, 'tipped') === 'TRUE' || getVal(r, 'tipped') === 'Yes';
						const hasDied = getVal(r, 'died') === 'TRUE' || getVal(r, 'died') === 'Yes';
						const hasCard = getVal(r, 'card') !== 'No Card' && getVal(r, 'card') !== 'N/A' && getVal(r, 'card') !== '';
						return hasMechanical || hasTipped || hasDied || hasCard;
					})}
					{#if teamMatchesWithIssues.length > 0}
						<section>
							<div class="flex items-center gap-3 md:gap-6 mb-4 md:mb-8">
								<h3 class="text-xs font-black text-yellow-500 uppercase tracking-[0.2em] md:tracking-[0.5em] whitespace-nowrap">⚠ Matches with Issues</h3>
								<div class="h-0.5 flex-1 bg-gradient-to-r from-yellow-800/30 to-transparent"></div>
							</div>
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4">
								{#each teamMatchesWithIssues as match}
									<div class="bg-yellow-900/10 border-2 border-yellow-800/30 hover:border-yellow-600/50 p-3 md:p-6 rounded-lg md:rounded-2xl transition-all">
										<p class="text-sm md:text-base font-black text-yellow-400 mb-2">Match {getVal(match, 'Match #')}</p>
										<div class="flex flex-wrap gap-1 md:gap-2">
											{#if getVal(match, 'mech issue') === 'TRUE' || getVal(match, 'mechanical issue') === 'Yes'}
												<span class="bg-red-900/30 text-red-400 text-[7px] md:text-[8px] px-2 py-1 rounded font-black uppercase">🔧 Mechanical</span>
											{/if}
											{#if getVal(match, 'died') === 'TRUE' || getVal(match, 'died') === 'Yes'}
												<span class="bg-red-900/30 text-red-400 text-[7px] md:text-[8px] px-2 py-1 rounded font-black uppercase">⚡ Died</span>
											{/if}
											{#if getVal(match, 'card') !== 'No Card' && getVal(match, 'card') !== 'N/A' && getVal(match, 'card') !== ''}
												<span class="bg-orange-900/30 text-orange-400 text-[7px] md:text-[8px] px-2 py-1 rounded font-black uppercase">🟨 {getVal(match, 'card')}</span>
											{/if}
											{#if getVal(match, 'tipped') === 'TRUE' || getVal(match, 'tipped') === 'Yes'}
												<span class="bg-red-900/30 text-red-400 text-[7px] md:text-[8px] px-2 py-1 rounded font-black uppercase">📌 Tipped</span>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</section>
					{/if}

					<section>
						<div class="flex items-center gap-3 md:gap-6 mb-4 md:mb-8">
							<h3 class="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] md:tracking-[0.5em] whitespace-nowrap">Battle Sequence</h3>
							<div class="h-0.5 flex-1 bg-gradient-to-r from-zinc-800 to-transparent"></div>
						</div>
						<div class="bg-black/60 p-3 md:p-10 rounded-xl md:rounded-[3rem] border-2 border-zinc-900 shadow-2xl overflow-x-auto">
							<div class="space-y-2 md:space-y-3 min-w-max">
								<div class="grid gap-3 md:gap-6 mb-4 md:mb-6" style="grid-template-columns: 80px 1fr; --gap: 0.75rem;">
									<div></div>
									<div class="relative h-6 md:h-8 text-[8px] md:text-[10px] font-black font-mono text-zinc-700 border-b-2 border-zinc-800 flex items-end pb-1 md:pb-2">
										{#each [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150] as t}
											<div class="absolute flex flex-col items-center group/time text-[7px] md:text-[10px]" style="left: {(t/150)*100}%">
												<div class="w-0.5 h-1.5 md:h-2 bg-zinc-800 group-hover/time:bg-blue-500 transition-colors mb-0.5 md:mb-1"></div>
												{t}s
											</div>
										{/each}
									</div>
								</div>
								{#each getGanttData(getVal(selectedRow, 'actions')) as { code, events }}
									<div class="grid grid-cols-[140px_1fr] gap-6 group/row">
										<div class="text-[10px] font-black text-zinc-600 uppercase flex items-center justify-end text-right leading-tight truncate group-hover/row:text-blue-400 transition-all duration-300" title={formatCode(code)}>{formatCode(code)}</div>
										<div class="relative h-10 bg-zinc-950/90 rounded-2xl border border-zinc-900 flex items-center overflow-hidden shadow-inner group-hover/row:border-zinc-700 transition-colors"><div class="absolute left-[10%] inset-y-0 w-0.5 bg-blue-500/20 z-0 shadow-[0_0_15px_rgba(59,130,246,0.2)]"></div>{#each events as event}{#if event.type === 'range'}<div class="absolute h-6 rounded-lg {getActionColor(code)} border-2 border-white/10 shadow-xl group-hover/row:brightness-125 transition-all duration-500 cursor-help" style="left: {(event.start/150)*100}%; width: {Math.max(1.5, ((event.end - event.start)/150)*100)}%" title="{formatCode(code)} ({event.start}s - {event.end}s)"></div>{:else}<div class="absolute w-2.5 h-6 {getActionColor(code)} border-2 border-white/30 z-10 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.2)]" style="left: {(event.time/150)*100}%; margin-left: -5px" title="{formatCode(code)} ({event.time}s)"></div>{/if}{/each}</div>
									</div>
								{:else}<div class="text-center py-20 text-[10px] font-black text-zinc-800 uppercase tracking-[1em] border-4 border-dashed border-zinc-900/50 rounded-[3rem]">Null Stream</div>{/each}
							</div>
						</div>
					</section>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-12">
						<section>
							<div class="flex items-center gap-6 mb-6"><h3 class="text-xs font-black text-zinc-500 uppercase tracking-[0.5em]">Match Incidents</h3><div class="h-0.5 flex-1 bg-gradient-to-r from-zinc-800 to-transparent"></div></div>
							{#if selectedRow}
								{@const hasMechanical = getVal(selectedRow, 'mech issue') === 'TRUE' || getVal(selectedRow, 'mechanical issue') === 'Yes'}
								{@const hasTipped = getVal(selectedRow, 'tipped') === 'TRUE' || getVal(selectedRow, 'tipped') === 'Yes'}
								{@const hasDied = getVal(selectedRow, 'died') === 'TRUE' || getVal(selectedRow, 'died') === 'Yes'}
								{@const hasCard = getVal(selectedRow, 'card') !== 'No Card' && getVal(selectedRow, 'card') !== 'N/A' && getVal(selectedRow, 'card') !== ''}
								{@const hasAnyIssue = hasMechanical || hasTipped || hasDied || hasCard}
								
								<div class="space-y-2">
									<!-- Overall Alert -->
									{#if hasAnyIssue}
										<div class="bg-red-950/40 border-2 border-red-500 rounded-lg p-3 animate-pulse">
											<p class="text-xs font-black text-red-400 uppercase tracking-widest">⚠️ INCIDENT(S) DETECTED</p>
										</div>
									{/if}
									
									<!-- Individual Incident Cards -->
									<div class="grid grid-cols-2 gap-2">
										<!-- Mechanical -->
										<div class="p-3 rounded-lg transition-all {hasMechanical ? 'bg-red-900/60 border-2 border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'bg-zinc-900/40 border border-zinc-800'}">
											<p class="text-[7px] font-black uppercase tracking-wider {hasMechanical ? 'text-red-300' : 'text-zinc-600'} mb-0.5">Mechanical</p>
											<p class="text-2xl font-black {hasMechanical ? 'text-red-400' : 'text-zinc-500'}">{hasMechanical ? '⚙️' : '✓'}</p>
											<p class="text-[10px] font-black {hasMechanical ? 'text-red-300' : 'text-zinc-600'} mt-1">{hasMechanical ? 'FAILED' : 'OK'}</p>
										</div>
										
										<!-- Tipped -->
										<div class="p-3 rounded-lg transition-all {hasTipped ? 'bg-orange-900/60 border-2 border-orange-500 shadow-[0_0_15px_rgba(234,88,12,0.4)]' : 'bg-zinc-900/40 border border-zinc-800'}">
											<p class="text-[7px] font-black uppercase tracking-wider {hasTipped ? 'text-orange-300' : 'text-zinc-600'} mb-0.5">Tipped</p>
											<p class="text-2xl font-black {hasTipped ? 'text-orange-400' : 'text-zinc-500'}">{hasTipped ? '⚠️' : '✓'}</p>
											<p class="text-[10px] font-black {hasTipped ? 'text-orange-300' : 'text-zinc-600'} mt-1">{hasTipped ? 'TIPPED' : 'OK'}</p>
										</div>
										
										<!-- Dead -->
										<div class="p-3 rounded-lg transition-all {hasDied ? 'bg-red-950/60 border-2 border-red-600 shadow-[0_0_15px_rgba(180,0,0,0.5)]' : 'bg-zinc-900/40 border border-zinc-800'}">
											<p class="text-[7px] font-black uppercase tracking-wider {hasDied ? 'text-red-300' : 'text-zinc-600'} mb-0.5">Dead</p>
											<p class="text-2xl font-black {hasDied ? 'text-red-500' : 'text-zinc-500'}">{hasDied ? '💀' : '✓'}</p>
											<p class="text-[10px] font-black {hasDied ? 'text-red-300' : 'text-zinc-600'} mt-1">{hasDied ? 'DEAD' : 'OK'}</p>
										</div>
										
										<!-- Card -->
										<div class="p-3 rounded-lg transition-all {hasCard ? 'bg-yellow-900/60 border-2 border-yellow-500 shadow-[0_0_15px_rgba(202,138,4,0.5)]' : 'bg-zinc-900/40 border border-zinc-800'}">
											<p class="text-[7px] font-black uppercase tracking-wider {hasCard ? 'text-yellow-300' : 'text-zinc-600'} mb-0.5">Card</p>
											<p class="text-2xl font-black {hasCard ? 'text-yellow-400' : 'text-zinc-500'}">{hasCard ? '🟡' : '✓'}</p>
											<p class="text-[9px] font-black {hasCard ? 'text-yellow-300' : 'text-zinc-600'} mt-1 truncate">{hasCard ? getVal(selectedRow, 'card') : 'OK'}</p>
										</div>
									</div>
								</div>
							{/if}
						</section>
						<section>
							<div class="flex items-center gap-6 mb-6"><h3 class="text-xs font-black text-zinc-500 uppercase tracking-[0.5em]">Tactical Specs</h3><div class="h-0.5 flex-1 bg-gradient-to-r from-zinc-800 to-transparent"></div></div>
							<div class="bg-zinc-900/40 p-8 rounded-[2.5rem] border-2 border-zinc-900 space-y-6 shadow-xl"><div class="flex justify-between items-center"><span class="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Start Vector</span> <span class="font-black text-white bg-zinc-800 px-5 py-2 rounded-2xl border border-zinc-700">{getVal(selectedRow, 'Starting position?')}</span></div><div class="flex justify-between items-center"><span class="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Auto Ascension</span> <span class="font-black text-blue-400 bg-blue-400/10 px-5 py-2 rounded-2xl border border-blue-500/20">{getVal(selectedRow, 'Auto climb?')}</span></div></div>
						</section>
						<section>
							<div class="flex items-center gap-6 mb-6"><h3 class="text-xs font-black text-zinc-500 uppercase tracking-[0.5em]">Auto Start Distribution</h3><div class="h-0.5 flex-1 bg-gradient-to-r from-zinc-800 to-transparent"></div></div>
							<div class="bg-zinc-900/40 p-8 rounded-[2.5rem] border-2 border-zinc-900 space-y-4 shadow-xl">
								{#each Object.entries(autoStartDistribution).sort((a,b) => b[1] - a[1]) as [pos, count]}
									{@const percentage = (count / selectedTeamMatches.length) * 100}
									{@const label = posMap[pos] || pos}
									<div class="space-y-1.5">
										<div class="flex justify-between items-center">
											<span class="text-[10px] font-black text-white uppercase tracking-widest">{label}</span>
											<span class="text-[10px] font-black text-zinc-500">{count} matches ({percentage.toFixed(0)}%)</span>
										</div>
										<div class="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
											<div class="h-full bg-blue-500 rounded-full transition-all duration-1000" style="width: {percentage}%"></div>
										</div>
									</div>
								{:else}
									<p class="text-[10px] font-black text-zinc-600 uppercase italic text-center py-4">No Auto Positioning Data Recorded</p>
								{/each}
							</div>
						</section>
					</div>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-12">
						<section>
							<div class="bg-zinc-900/40 p-4 md:p-8 rounded-lg md:rounded-[2.5rem] border-2 border-zinc-900 space-y-3 md:space-y-6 shadow-xl">
								<div class="flex justify-between items-center gap-2">
									<span class="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">Climb Grade</span>
									<span class="font-black text-purple-400 bg-purple-400/10 border-2 border-purple-500/30 px-3 md:px-5 py-1 md:py-2 rounded-lg md:rounded-2xl shadow-[0_0_15px_rgba(168,85,247,0.2)] text-xs md:text-base">{getVal(selectedRow, 'climb level')}</span>
								</div>
								<div class="flex justify-between items-center gap-2">
									<span class="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">Final Anchor</span>
									<span class="font-black text-zinc-300 bg-zinc-800 px-3 md:px-5 py-1 md:py-2 rounded-lg md:rounded-2xl border border-zinc-700 text-xs md:text-base">{getVal(selectedRow, 'end climb pos')}</span>
								</div>
							</div>
						</section>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- SOS Leaderboard Modal -->
{#if showSosLeaderboard}
	{@const sosMap = computeEventSOS()}
	{@const sosList = [...sosMap.entries()].sort((a, b) => b[1].sosValue - a[1].sosValue)}
	<div class="fixed inset-0 z-[120] flex items-center justify-center p-2 md:p-4 bg-black/95 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200"
		role="dialog"
		aria-modal="true"
		on:click|self={() => showSosLeaderboard = false}
		on:keydown={(e) => e.key === 'Escape' && (showSosLeaderboard = false)}>
		<div class="bg-[#0a0a0a] border-2 border-zinc-800 rounded-[2rem] w-full max-w-lg max-h-[80vh] overflow-hidden shadow-[0_0_150px_rgba(0,0,0,1)] flex flex-col">
			<div class="p-6 border-b-2 border-zinc-800 flex justify-between items-center flex-shrink-0">
				<div>
					<h2 class="text-xl font-black text-cyan-400 uppercase tracking-tighter">Strength of Schedule</h2>
					<p class="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Sorted by schedule difficulty (hardest first)</p>
				</div>
				<button on:click={() => showSosLeaderboard = false} class="w-10 h-10 flex items-center justify-center bg-zinc-900 hover:bg-red-600 rounded-xl transition text-zinc-400 hover:text-white"><span class="text-xl">✕</span></button>
			</div>
			<div class="overflow-y-auto flex-1 p-4">
				<div class="space-y-1">
					{#each sosList as [team, data], idx}
						{@const isActive = team === overviewTeam}
						<button
							on:click={() => { overviewTeam = team; showSosLeaderboard = false; }}
							class="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all {isActive ? 'bg-cyan-500/10 border border-cyan-500/30' : 'hover:bg-zinc-800/50 border border-transparent'}">
							<span class="text-[10px] font-black text-zinc-600 w-6 text-right">{idx + 1}</span>
							<span class="text-sm font-black {isActive ? 'text-cyan-400' : 'text-white'} w-16">{team}</span>
							<span class="text-[10px] font-bold text-zinc-500 flex-1 truncate">{teamDetailsMap.get(team)?.nickname || ''}</span>
							<div class="text-right flex-shrink-0">
								<span class="text-sm font-black {data.sosValue >= 0 ? 'text-red-400' : 'text-green-400'}">{data.sosValue >= 0 ? '+' : ''}{data.sosValue.toFixed(1)}</span>
								<div class="flex gap-3 text-[8px] text-zinc-600 font-bold">
									<span>Opp: {data.avgOppEpa.toFixed(0)}</span>
									<span>Ptr: {data.avgPartnerEpa.toFixed(0)}</span>
								</div>
							</div>
						</button>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Match Scouting Data Popup -->
{#if selectedMatchPopup}
	{@const matchData = getMatchScoutingData(selectedMatchPopup.match_number)}
	<div class="fixed inset-0 z-[120] flex items-center justify-center p-2 md:p-4 bg-black/95 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200" 
		role="dialog"
		aria-modal="true"
		on:click|self={() => selectedMatchPopup = null}
		on:keydown={(e) => e.key === 'Escape' && (selectedMatchPopup = null)}>
		<div class="bg-[#0a0a0a] border-2 border-zinc-800 rounded-t-[2rem] md:rounded-[3rem] w-full md:max-w-6xl max-h-[90vh] overflow-y-auto shadow-[0_0_150px_rgba(0,0,0,1)]">
			<!-- Header -->
			<div class="sticky top-0 bg-[#0a0a0a]/90 backdrop-blur-md p-3 md:p-10 border-b-2 border-zinc-800 flex md:justify-between md:items-center gap-3 z-10">
				<div class="flex-1 min-w-0">
					<h2 class="text-2xl md:text-5xl font-black uppercase tracking-tighter mb-2 text-zinc-200">Match {selectedMatchPopup.match_number}</h2>
					<p class="text-[10px] md:text-xs text-zinc-600 uppercase font-black tracking-[0.2em]">Complete Scouting Overview</p>
				</div>
				<button on:click={() => selectedMatchPopup = null} class="w-10 h-10 md:w-16 md:h-16 flex items-center justify-center bg-zinc-900 hover:bg-red-600 rounded-lg md:rounded-[1.5rem] transition text-zinc-400 hover:text-white shadow-2xl group flex-shrink-0"><span class="text-xl md:text-3xl group-hover:rotate-90 transition-transform duration-300">✕</span></button>
			</div>

			<!-- Content -->
			<div class="p-3 md:p-10 space-y-8 md:space-y-12">
				<!-- Match Videos -->
				{#if matchData.videos && matchData.videos.length > 0}
					<section class="flex flex-col w-full">
						<div class="flex items-center justify-between mb-4 md:mb-6">
							<h3 class="text-lg md:text-2xl font-black text-purple-500 uppercase tracking-wider flex items-center gap-3">
								<div class="w-4 h-4 rounded-lg bg-purple-600"></div>
								Match Videos
							</h3>
							<button 
								on:click={() => videosCollapsed = !videosCollapsed}
								class="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-lg bg-purple-900/40 hover:bg-purple-900/60 border border-purple-500/30 hover:border-purple-500/60 transition-all text-purple-300 hover:text-purple-200"
								title={videosCollapsed ? 'Expand videos' : 'Collapse videos'}>
								<span class="text-lg md:text-xl transition-transform {videosCollapsed ? 'rotate-0' : 'rotate-180'}">⌄</span>
							</button>
						</div>
						
						{#if !videosCollapsed}
							<div class="w-full flex flex-col gap-4 md:gap-6">
								{#each matchData.videos as video}
									<div class="bg-purple-950/20 border-2 border-purple-500/30 rounded-2xl overflow-hidden hover:border-purple-500/60 transition-all group">
										<div class="relative w-full bg-black flex items-center justify-center" style="aspect-ratio: 16 / 9; min-height: 350px;">
											<iframe
												width="100%"
												height="100%"
												src={video.url}
												title="Match Video"
												frameborder="0"
												allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
												allowfullscreen
												class="w-full h-full">
											</iframe>
										</div>
										<div class="p-3 md:p-4">
											<p class="text-[9px] md:text-xs font-black text-purple-400 uppercase tracking-widest">YouTube Video</p>
											<a href={`https://www.youtube.com/watch?v=${video.key}`} target="_blank" rel="noopener noreferrer" class="text-[10px] md:text-sm font-black text-purple-300 hover:text-purple-200 transition block mt-1">Watch on YouTube →</a>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<div class="text-center py-4 text-zinc-500 text-sm italic">Videos collapsed • Click expand to view</div>
						{/if}
					</section>
				{/if}

				<!-- Match Events Timeline / Gantt Chart -->
				{#if matchData.ganttData && matchData.ganttData.length > 0}
					<section>
						<h3 class="text-lg md:text-2xl font-black text-cyan-500 uppercase tracking-wider mb-6 flex items-center gap-3">
							<div class="w-4 h-4 rounded-lg bg-cyan-600"></div>
							Match Timeline
						</h3>
						<div class="bg-zinc-900/40 border-2 border-cyan-500/20 rounded-2xl p-4 md:p-6 overflow-x-auto">
							<!-- Video Progress Indicator (if videos exist) -->
							{#if matchData.videos && matchData.videos.length > 0}
								<div class="mb-4 pb-4 border-b border-cyan-500/20">
									<div class="flex items-center gap-2 mb-2">
										<span class="text-[8px] md:text-[9px] font-black text-cyan-400 uppercase tracking-widest">Video Sync</span>
										<span class="text-[8px] text-cyan-500 font-bold">{Math.round(videoCurrentTime)}s / 150s</span>
									</div>
									<div class="relative w-full h-6 md:h-8 bg-zinc-950/50 rounded border border-cyan-500/30 overflow-hidden cursor-pointer group" on:click={(e) => {
										const rect = e.currentTarget.getBoundingClientRect();
										const percent = (e.clientX - rect.left) / rect.width;
										videoCurrentTime = Math.max(0, Math.min(150, percent * 150));
									}} on:keydown={(e) => {
										if (e.key === 'ArrowLeft') videoCurrentTime = Math.max(0, videoCurrentTime - 1);
										if (e.key === 'ArrowRight') videoCurrentTime = Math.min(150, videoCurrentTime + 1);
									}} role="slider" tabindex="0" aria-label="Video timeline sync">
										<!-- Time markers -->
										<div class="absolute inset-0 flex text-[7px] text-cyan-700 pointer-events-none z-0">
											{#each [0, 30, 60, 90, 120, 150] as time}
												<div class="flex-1 border-r border-cyan-900/30 px-1">{time}</div>
											{/each}
										</div>
										<!-- Progress bar -->
										<div class="absolute top-0 bottom-0 bg-gradient-to-r from-cyan-600 to-cyan-500 z-10 group-hover:from-cyan-500 group-hover:to-cyan-400 transition-all" style="width: {(videoCurrentTime / 150) * 100}%;"></div>
										<!-- Current time indicator -->
										<div class="absolute top-0 bottom-0 w-0.5 bg-white z-20 shadow-lg" style="left: {(videoCurrentTime / 150) * 100}%;"></div>
									</div>
									<p class="text-[7px] md:text-[8px] text-zinc-500 mt-1 italic">Click or drag to sync timeline • Arrow keys to adjust</p>
								</div>
							{/if}
							
							<div class="min-w-full space-y-4">
								{#each [...matchData.red, ...matchData.blue] as { team, scout }}
									{@const isRed = matchData.red.some(r => r.team === team)}
									{@const teamEvents = matchData.ganttData.filter(g => g.team === team).sort((a, b) => a.start - b.start)}
									{#if teamEvents.length > 0}
										<div class="pb-4 last:pb-0">
											<div class="flex items-center gap-2 mb-2">
												<div class="w-3 h-3 rounded-full {isRed ? 'bg-red-500' : 'bg-blue-500'}"></div>
												<p class="text-sm md:text-base font-black {isRed ? 'text-red-400' : 'text-blue-400'} min-w-fit">Team {team}</p>
											</div>
											<div class="relative w-full h-10 md:h-12 bg-zinc-950/50 rounded-lg border border-zinc-800 flex items-center">
												<!-- Time markers -->
												<div class="absolute inset-0 flex text-[8px] text-zinc-600 pointer-events-none">
													{#each [0, 30, 60, 90, 120, 150] as time}
														<div class="flex-1 border-r border-zinc-800/50 px-1">{time}s</div>
													{/each}
												</div>
												
												<!-- Events -->
												{#each teamEvents as event}
													{@const startPercent = (event.start / 150) * 100}
													{@const widthPercent = Math.max(((event.end - event.start) / 150) * 100, 2)}
													{@const eventColor = getActionColor(event.code)}
													{@const isActive = videoCurrentTime >= event.start && videoCurrentTime <= event.end}
													<div
														class="absolute top-1 md:top-2 bottom-1 md:bottom-2 rounded text-[7px] md:text-[9px] font-black text-white px-1 md:px-1.5 flex items-center justify-center truncate {eventColor} {isActive ? 'ring-2 ring-white shadow-[0_0_8px_rgba(255,255,255,0.5)]' : ''} transition-all"
														style="left: {startPercent}%; width: {widthPercent}%;"
														title="{event.code}: {event.start}s - {event.end}s ({event.end - event.start}s)">
														<span class="truncate">{event.code}</span>
													</div>
												{/each}
												
												<!-- Current time indicator -->
												{#if matchData.videos && matchData.videos.length > 0}
													<div class="absolute top-0 bottom-0 w-0.5 bg-white z-30 pointer-events-none shadow-lg" style="left: {(videoCurrentTime / 150) * 100}%;"></div>
												{/if}
											</div>
										</div>
									{/if}
								{/each}
							</div>
						</div>
					</section>
				{/if}

				<!-- Match Result/Prediction -->
				{#if selectedMatchPopup}
					{@const hasScouted = hasMatchScoutedData(selectedMatchPopup.match_number)}
					{@const result = getMatchResult(selectedMatchPopup.match_number)}
					{@const scoutedBreakdown = hasScouted ? getMatchScoutedBreakdown(selectedMatchPopup.match_number) : null}
					{@const prediction = !hasScouted ? getMatchPrediction(selectedMatchPopup.match_number) : null}
					{#if result || scoutedBreakdown || prediction}
						<section class="bg-zinc-900/60 border-2 border-zinc-800 rounded-2xl p-4 md:p-8">
							<h3 class="text-sm md:text-base font-black text-zinc-400 uppercase tracking-widest mb-1">Match Outcome</h3>
							{#if result}
								<p class="text-[8px] md:text-[9px] font-black text-blue-500 uppercase tracking-widest mb-4">Official Match Result</p>
								<div class="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
									<div class="bg-red-950/40 border border-red-500/30 rounded-lg p-3 md:p-4 text-center">
										<p class="text-[10px] md:text-xs font-black text-red-400 uppercase tracking-widest mb-1">Red</p>
										<p class="text-2xl md:text-4xl font-black text-white">{result.red}</p>
									</div>
									<div class="bg-blue-950/40 border border-blue-500/30 rounded-lg p-3 md:p-4 text-center">
										<p class="text-[10px] md:text-xs font-black text-blue-400 uppercase tracking-widest mb-1">Blue</p>
										<p class="text-2xl md:text-4xl font-black text-white">{result.blue}</p>
									</div>
									<div class="bg-yellow-950/40 border border-yellow-500/30 rounded-lg p-3 md:p-4 text-center md:col-span-1">
										<p class="text-[10px] md:text-xs font-black text-yellow-400 uppercase tracking-widest mb-1">Winner</p>
										<p class="text-lg md:text-2xl font-black {result.winner === 'red' ? 'text-red-400' : result.winner === 'blue' ? 'text-blue-400' : 'text-zinc-400'}">{result.winner === 'red' ? '🔴 RED' : result.winner === 'blue' ? '🔵 BLUE' : 'TIE'}</p>
									</div>
								</div>
							{:else if prediction}
								<p class="text-[8px] md:text-[9px] font-black text-orange-500 uppercase tracking-widest mb-4">Predicted Outcome (No Scout Data)</p>
								<div class="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
									<div class="bg-red-950/40 border border-red-500/30 rounded-lg p-3 md:p-4 text-center">
										<p class="text-[10px] md:text-xs font-black text-red-400 uppercase tracking-widest mb-1">Red Predicted</p>
										<p class="text-2xl md:text-4xl font-black text-red-300">{prediction.red.toFixed(1)}</p>
										<p class="text-[8px] md:text-[9px] font-black text-red-600 uppercase tracking-widest mt-1">EPA</p>
									</div>
									<div class="bg-blue-950/40 border border-blue-500/30 rounded-lg p-3 md:p-4 text-center">
										<p class="text-[10px] md:text-xs font-black text-blue-400 uppercase tracking-widest mb-1">Blue Predicted</p>
										<p class="text-2xl md:text-4xl font-black text-blue-300">{prediction.blue.toFixed(1)}</p>
										<p class="text-[8px] md:text-[9px] font-black text-blue-600 uppercase tracking-widest mt-1">EPA</p>
									</div>
									<div class="bg-yellow-950/40 border border-yellow-500/30 rounded-lg p-3 md:p-4 text-center md:col-span-1">
										<p class="text-[10px] md:text-xs font-black text-yellow-400 uppercase tracking-widest mb-1">Predicted</p>
										<p class="text-lg md:text-2xl font-black {prediction.winner === 'red' ? 'text-red-400' : prediction.winner === 'blue' ? 'text-blue-400' : 'text-zinc-400'}">{prediction.winner === 'red' ? '🔴 RED' : prediction.winner === 'blue' ? '🔵 BLUE' : 'TIE'}</p>
									</div>
								</div>
							{/if}
						</section>
					{/if}
				{/if}

				<!-- Red Alliance -->
				<section>
					<h3 class="text-lg md:text-2xl font-black text-red-500 uppercase tracking-wider mb-6 flex items-center gap-3">
						<div class="w-4 h-4 rounded-lg bg-red-600"></div>
						Red Alliance
					</h3>
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
						{#each matchData.red as { team, scout }}
							{@const colors = teamColorsMap.get(team) || { primary: '#ef4444', secondary: '#991b1b' }}
							{@const issues = getTeamMatchIssues(team, selectedMatchPopup.match_number)}
							{@const scoring = scout ? parseFloat(getVal(scout, 'Scoring effectiveness?')) || 0 : null}
							{@const feeding = scout ? parseFloat(getVal(scout, 'feeding score?')) || 0 : null}
							<div class="bg-red-950/20 border-2 border-red-500/30 rounded-2xl p-4 md:p-6 cursor-pointer hover:border-red-500/60 transition-all group" 
								role="button"
								on:click={() => { const matchNum = selectedMatchPopup.match_number; selectedMatchPopup = null; handleRowClick(scout || { 'Team #': team, 'Match #': matchNum }); }}
								on:keydown={(e) => e.key === 'Enter' && (() => { const matchNum = selectedMatchPopup.match_number; selectedMatchPopup = null; handleRowClick(scout || { 'Team #': team, 'Match #': matchNum }); })()}>
								<div class="flex items-start justify-between gap-3 mb-4">
									<div>
										<p class="text-2xl md:text-4xl font-black text-white">{team}</p>
										<p class="text-[10px] text-zinc-500 font-black uppercase tracking-wider mt-1">{scout ? 'Scouted' : 'Not Scouted'}</p>
									</div>
									<div class="w-3 h-3 rounded-full {scout ? 'bg-green-500' : 'bg-red-900'}"></div>
								</div>
								
								{#if scout}
									{#if issues && (issues.hasMechanical || issues.hasTipped || issues.hasDied || issues.hasCard)}
										<div class="mb-3 p-2 md:p-3 bg-red-900/60 border border-red-500/50 rounded-lg">
											<p class="text-[8px] md:text-[9px] font-black text-red-300 uppercase tracking-widest mb-2">Issues Detected</p>
											<div class="flex flex-wrap gap-1.5">
												{#if issues.hasMechanical}<span class="bg-red-800/80 text-red-200 px-2 py-0.5 rounded text-[8px] font-black">⚙️ Mechanical</span>{/if}
												{#if issues.hasTipped}<span class="bg-orange-800/80 text-orange-200 px-2 py-0.5 rounded text-[8px] font-black">⚠️ Tipped</span>{/if}
												{#if issues.hasDied}<span class="bg-red-950/80 text-red-200 px-2 py-0.5 rounded text-[8px] font-black">💀 Dead</span>{/if}
												{#if issues.hasCard}<span class="bg-yellow-800/80 text-yellow-200 px-2 py-0.5 rounded text-[8px] font-black">🟡 Card</span>{/if}
											</div>
										</div>
									{/if}
									<div class="space-y-2 md:space-y-3 text-[9px] md:text-sm">
										<div class="flex justify-between"><span class="text-zinc-600">Scoring Eff.:</span><span class="font-black text-orange-400">{scoring.toFixed(1)}/5</span></div>
										<div class="flex justify-between"><span class="text-zinc-600">Feeding Skill:</span><span class="font-black text-green-400">{feeding.toFixed(1)}/5</span></div>
										<div class="flex justify-between"><span class="text-zinc-600">EPA:</span><span class="font-black text-white">{(teamMetrics.find(m => m.teamNum === team)?.epa || 0).toFixed(1)}</span></div>
										<div class="flex justify-between"><span class="text-zinc-600">Scout:</span><span class="font-black text-white">{getVal(scout, 'Scouter initials')}</span></div>
										<div class="flex justify-between"><span class="text-zinc-600">Climb:</span><span class="font-black text-purple-400">{getVal(scout, 'climb level')}</span></div>
									</div>
								{:else}
									<div class="space-y-2 md:space-y-3 text-[9px] md:text-sm">
										<div class="flex justify-between"><span class="text-zinc-600">Predicted EPA:</span><span class="font-black text-white">{(teamMetrics.find(m => m.teamNum === team)?.epa || 0).toFixed(1)}</span></div>
										<p class="text-[8px] text-zinc-500 italic">Scouting data not available for this match</p>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</section>

				<!-- Blue Alliance -->
				<section>
					<h3 class="text-lg md:text-2xl font-black text-blue-500 uppercase tracking-wider mb-6 flex items-center gap-3">
						<div class="w-4 h-4 rounded-lg bg-blue-600"></div>
						Blue Alliance
					</h3>
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
						{#each matchData.blue as { team, scout }}
							{@const colors = teamColorsMap.get(team) || { primary: '#3b82f6', secondary: '#1e40af' }}
							{@const issues = getTeamMatchIssues(team, selectedMatchPopup.match_number)}
							{@const scoring = scout ? parseFloat(getVal(scout, 'Scoring effectiveness?')) || 0 : null}
							{@const feeding = scout ? parseFloat(getVal(scout, 'feeding score?')) || 0 : null}
							<div class="bg-blue-950/20 border-2 border-blue-500/30 rounded-2xl p-4 md:p-6 cursor-pointer hover:border-blue-500/60 transition-all group" 
								role="button"
								on:click={() => { const matchNum = selectedMatchPopup.match_number; selectedMatchPopup = null; handleRowClick(scout || { 'Team #': team, 'Match #': matchNum }); }}
								on:keydown={(e) => e.key === 'Enter' && (() => { const matchNum = selectedMatchPopup.match_number; selectedMatchPopup = null; handleRowClick(scout || { 'Team #': team, 'Match #': matchNum }); })()}>
								<div class="flex items-start justify-between gap-3 mb-4">
									<div>
										<p class="text-2xl md:text-4xl font-black text-white">{team}</p>
										<p class="text-[10px] text-zinc-500 font-black uppercase tracking-wider mt-1">{scout ? 'Scouted' : 'Not Scouted'}</p>
									</div>
									<div class="w-3 h-3 rounded-full {scout ? 'bg-green-500' : 'bg-red-900'}"></div>
								</div>
								
								{#if scout}
									{#if issues && (issues.hasMechanical || issues.hasTipped || issues.hasDied || issues.hasCard)}
										<div class="mb-3 p-2 md:p-3 bg-red-900/60 border border-red-500/50 rounded-lg">
											<p class="text-[8px] md:text-[9px] font-black text-red-300 uppercase tracking-widest mb-2">Issues Detected</p>
											<div class="flex flex-wrap gap-1.5">
												{#if issues.hasMechanical}<span class="bg-red-800/80 text-red-200 px-2 py-0.5 rounded text-[8px] font-black">⚙️ Mechanical</span>{/if}
												{#if issues.hasTipped}<span class="bg-orange-800/80 text-orange-200 px-2 py-0.5 rounded text-[8px] font-black">⚠️ Tipped</span>{/if}
												{#if issues.hasDied}<span class="bg-red-950/80 text-red-200 px-2 py-0.5 rounded text-[8px] font-black">💀 Dead</span>{/if}
												{#if issues.hasCard}<span class="bg-yellow-800/80 text-yellow-200 px-2 py-0.5 rounded text-[8px] font-black">🟡 Card</span>{/if}
											</div>
										</div>
									{/if}
									<div class="space-y-2 md:space-y-3 text-[9px] md:text-sm">
										<div class="flex justify-between"><span class="text-zinc-600">Scoring Eff.:</span><span class="font-black text-orange-400">{scoring.toFixed(1)}/5</span></div>
										<div class="flex justify-between"><span class="text-zinc-600">Feeding Skill:</span><span class="font-black text-green-400">{feeding.toFixed(1)}/5</span></div>
										<div class="flex justify-between"><span class="text-zinc-600">EPA:</span><span class="font-black text-white">{(teamMetrics.find(m => m.teamNum === team)?.epa || 0).toFixed(1)}</span></div>
										<div class="flex justify-between"><span class="text-zinc-600">Scout:</span><span class="font-black text-white">{getVal(scout, 'Scouter initials')}</span></div>
										<div class="flex justify-between"><span class="text-zinc-600">Climb:</span><span class="font-black text-purple-400">{getVal(scout, 'climb level')}</span></div>
									</div>
								{:else}
									<div class="space-y-2 md:space-y-3 text-[9px] md:text-sm">
										<div class="flex justify-between"><span class="text-zinc-600">Predicted EPA:</span><span class="font-black text-white">{(teamMetrics.find(m => m.teamNum === team)?.epa || 0).toFixed(1)}</span></div>
										<p class="text-[8px] text-zinc-500 italic">Scouting data not available for this match</p>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</section>

			</div>
		</div>
	</div>
{/if}

<!-- Image Viewer Modal -->
{#if viewerImageSrc}
	<div class="fixed inset-0 z-[200] flex items-center justify-center bg-black/98 backdrop-blur-lg animate-in fade-in duration-200"
		role="dialog"
		aria-modal="true"
		aria-label="Image viewer"
		on:click={closeImageViewer}
		on:keydown={(e) => e.key === 'Escape' && closeImageViewer()}>
		
		<!-- Controls -->
		<div class="absolute top-6 right-6 flex gap-3 z-10">
			<button 
				on:click|stopPropagation={() => viewerScale = Math.max(0.5, viewerScale - 0.25)}
				class="bg-zinc-900/80 hover:bg-zinc-800 text-white p-3 rounded-xl font-black text-xl transition shadow-2xl backdrop-blur-sm border border-zinc-700"
				aria-label="Zoom out">
				−
			</button>
			<div class="bg-zinc-900/80 text-white px-4 py-3 rounded-xl font-black text-sm backdrop-blur-sm border border-zinc-700">
				{Math.round(viewerScale * 100)}%
			</div>
			<button 
				on:click|stopPropagation={() => viewerScale = Math.min(5, viewerScale + 0.25)}
				class="bg-zinc-900/80 hover:bg-zinc-800 text-white p-3 rounded-xl font-black text-xl transition shadow-2xl backdrop-blur-sm border border-zinc-700"
				aria-label="Zoom in">
				+
			</button>
			<button 
				on:click|stopPropagation={() => { viewerScale = 1; viewerTranslateX = 0; viewerTranslateY = 0; }}
				class="bg-zinc-900/80 hover:bg-zinc-800 text-white px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition shadow-2xl backdrop-blur-sm border border-zinc-700"
				aria-label="Reset view">
				Reset
			</button>
			<button 
				on:click={closeImageViewer}
				class="bg-red-600/80 hover:bg-red-600 text-white p-3 rounded-xl font-black text-2xl transition shadow-2xl backdrop-blur-sm border border-red-700"
				aria-label="Close viewer">
				✕
			</button>
		</div>

		<!-- Instructions -->
		<div class="absolute bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900/80 text-zinc-400 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest backdrop-blur-sm border border-zinc-700 z-[200]">
			{#if viewerScale > 1}
				<span class="text-blue-400">Drag to pan</span> • 
			{/if}
			Scroll to zoom • Click outside to close • ESC to exit
		</div>

		<!-- Image Container -->
		<div class="w-full h-full flex items-center justify-center p-8 overflow-hidden"
			on:click|stopPropagation
			on:wheel={handleViewerWheel}
			on:mousedown={handleViewerMouseDown}
			on:mousemove={handleViewerMouseMove}
			on:mouseup={handleViewerMouseUp}
			on:mouseleave={handleViewerMouseUp}
			on:touchstart={handleViewerTouchStart}
			on:touchmove={handleViewerTouchMove}
			on:touchend={handleViewerTouchEnd}
			style="cursor: {viewerScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'}">
			<img 
				src={viewerImageSrc} 
				alt="Robot fullscreen view"
				class="max-w-full max-h-full object-contain select-none transition-transform duration-100"
				style="transform: scale({viewerScale}) translate({viewerTranslateX / viewerScale}px, {viewerTranslateY / viewerScale}px); transform-origin: center;"
				draggable="false" />
		</div>
	</div>
{/if}

<!-- Simulator Load Context Menu -->
<ContextMenu
	{contextMenu}
	{contextMenuMatch}
	onLoadSimulator={(match) => loadMatchIntoSimulator(match)}
	onClose={() => contextMenu = null}
/>
<OverrideContextMenu
	contextMenu={overrideContextMenu}
	matchLabel={overrideContextMenuLabel}
	redLabel={overrideContextMenuRedLabel}
	blueLabel={overrideContextMenuBlueLabel}
	onOverrideRed={handleOverrideRed}
	onOverrideBlue={handleOverrideBlue}
	onClearOverride={handleClearSingleOverride}
	onClose={() => overrideContextMenu = null}
/>

<Footer />

<style>
	:global(body) { background-color: #050505; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
	::-webkit-scrollbar { width: 8px; }
	::-webkit-scrollbar-track { background: #050505; }
	::-webkit-scrollbar-thumb { background: #18181b; border-radius: 10px; }
	::-webkit-scrollbar-thumb:hover { background: #27272a; }
	.shadow-inner { box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.6); }
	.custom-scrollbar::-webkit-scrollbar {
		width: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: #27272a;
		border-radius: 10px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: #3b82f6;
	}
</style>
