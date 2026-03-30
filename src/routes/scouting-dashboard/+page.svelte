<script>
	import Navbar from '../../components/navbar.svelte';
	import Footer from '../../components/footer.svelte';
	import CoverageMap from '../../components/scoutingDashboard/CoverageMap.svelte';
	import SimulatorHeader from '../../components/scoutingDashboard/SimulatorHeader.svelte';
	import SimulatorTeamCard from '../../components/scoutingDashboard/SimulatorTeamCard.svelte';
	import ContextMenu from '../../components/scoutingDashboard/ContextMenu.svelte';
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
		rankings: false
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
	let quickLinksOpen = false;

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
		if (!eventRankings || eventRankings.length === 0) return [];
		
		const teamsWithMetricsMap = new Map(allTeamsList.map(tNum => {
			const stats = teamStatsMap.get(tNum) || { epa: 0 };
			const opr = eventOprs[`frc${tNum}`] || 0;
			return [tNum, { teamNum: tNum, epa: stats.epa, opr: opr }];
		}));

		let rankingList = eventRankings.map(r => r.team_key.replace('frc', ''));
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

	// Context menu for simulator
	let contextMenu = null;
	let contextMenuMatch = null;

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
				const res = await fetch(CSV_URL);
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
				const resPit = await fetch(PIT_CSV_URL);
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
				timestamp: Date.now()
			}));
		}
	}

	async function fetchEventStats() {
		try {
			const res = await fetch(`https://www.thebluealliance.com/api/v3/event/${EVENT_KEY}/oprs`, {
				headers: { 'X-TBA-Auth-Key': TBA_KEY }
			});
			if (res.ok) {
				const data = await res.json();
				eventOprs = data.oprs || {};
			}
		} catch (e) {
			console.error('Error fetching TBA OPRs:', e);
		}
	}

	async function fetchEventRankings() {
		try {
			const res = await fetch(`https://www.thebluealliance.com/api/v3/event/${EVENT_KEY}/rankings`, {
				headers: { 'X-TBA-Auth-Key': TBA_KEY }
			});
			if (res.ok) {
				const data = await res.json();
				eventRankings = data.rankings || [];
			}
		} catch (e) {
			console.error('Error fetching TBA rankings:', e);
		}
	}

	async function fetchSchedule() {
		try {
			const res = await fetch(`https://www.thebluealliance.com/api/v3/event/${EVENT_KEY}/matches`, {
				headers: { 'X-TBA-Auth-Key': TBA_KEY }
			});
			if (res.ok) {
				const data = await res.json();
				schedule = data
					.filter(m => m.comp_level === 'qm')
					.sort((a, b) => a.match_number - b.match_number);
			}
		} catch (e) {
			console.error('Error fetching schedule:', e);
		}
	}

	async function fetchEventTeams() {
		try {
			const res = await fetch(`https://www.thebluealliance.com/api/v3/event/${EVENT_KEY}/teams/keys`, {
				headers: { 'X-TBA-Auth-Key': TBA_KEY }
			});
			if (res.ok) {
				const data = await res.json();
				eventTeams = data.map(key => key.replace('frc', '')).sort((a, b) => parseInt(a) - parseInt(b));
				saveCache();
			}
		} catch (e) {
			console.error('Error fetching event teams:', e);
		}
	}

	async function fetchAllTeamStats() {
		const uniqueTeams = allTeamsList;
		const currentYear = 2026;
		
		// Filter out teams we already have cached
		const teamsToFetch = uniqueTeams.filter(t => !teamStatsMap.has(t));
		
		if (teamsToFetch.length === 0) return;

		try {
			// Fetch all teams concurrently
			const promises = teamsToFetch.map(teamNum =>
				fetch(`https://api.statbotics.io/v3/team_year/${teamNum}/${currentYear}`)
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
						norm: data?.epa?.norm || 0
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

	onMount(() => {
		const messageInterval = setInterval(() => {
			let nextIndex;
			do {
				nextIndex = Math.floor(Math.random() * funMessages.length);
			} while (nextIndex === currentMessageIndex);
			currentMessageIndex = nextIndex;
		}, 3000);

		console.log('onMount called, loading:', loading);
		const cached = localStorage.getItem('scouting_cache');
		if (cached) {
			const parsed = JSON.parse(cached);
			const { data, pit, teams, rankings, stats, colors, details, timestamp } = parsed;
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
					return fetchSchedule();
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

			return {
				teamNum,
				avgEff,
				climbRate,
				entryCount: rows.length,
				epa: stats.epa,
				opr: opr
			};
		});

	$: overviewTeamSchedule = overviewTeam ? schedule
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
			return { ...m, alliance, swapNeeded, isPlayed: !!result };
		}) : [];

	$: sortedLeaderboard = [...teamMetrics].sort((a, b) => {
		let valA, valB;
		if (sortKey === 'Team #') { valA = extractNumber(a.teamNum); valB = extractNumber(b.teamNum); }
		else if (sortKey === 'EPA') { valA = a.epa; valB = b.epa; }
		else if (sortKey === 'OPR') { valA = a.opr; valB = b.opr; }
		else if (sortKey === 'Climb Rate') { valA = a.climbRate; valB = b.climbRate; }
		else if (sortKey === 'Avg Eff.') { valA = a.avgEff; valB = b.avgEff; }
		else if (sortKey === 'Samples') { valA = a.entryCount; valB = b.entryCount; }
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
              <a href="https://www.thebluealliance.com/event/{EVENT_KEY}" target="_blank" rel="noopener noreferrer" class="block px-4 py-2 text-sm text-zinc-100 hover:bg-zinc-800 hover:text-white transition">
                TBA Event
              </a>
              <a href="https://www.statbotics.io/event/{EVENT_KEY}" target="_blank" rel="noopener noreferrer" class="block px-4 py-2 text-sm text-zinc-100 hover:bg-zinc-800 hover:text-white last:rounded-b-lg transition">
                Statbotics
              </a>
            </div>
          {/if}
        </div>
				{#if simulatorMode}
					<button on:click={clearSimulator} class="px-3 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition border-2 border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white shadow-[0_0_15px_rgba(239,68,68,0.2)] ml-auto">
						Clear All
					</button>
				{/if}
			</div>
		</div>

		<!-- Match Coverage Map -->
		<CoverageMap
			{schedule}
			{hoveredMatch}
			{searchTerm}
			{getScouterCount}
			{getMatchBreakdown}
			{teamIsInMatch}
			onMatchClick={(match) => selectedMatchPopup = match}
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
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 mb-12 animate-in fade-in slide-in-from-top-4">
				<div class="bg-red-950/10 border-2 border-red-500/20 rounded-2xl md:rounded-[2rem] p-4 md:p-8 shadow-2xl backdrop-blur-sm">
					<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 md:mb-8">
						<h2 class="text-2xl md:text-3xl font-black text-red-500 uppercase italic tracking-tighter">Red Alliance</h2>
						<div class="flex gap-4 md:gap-6">
							<div class="text-right"><p class="text-[8px] md:text-[10px] font-black text-red-400 uppercase tracking-[0.2em]">EPA</p><p class="text-2xl md:text-4xl font-black text-white">{simAggregates.red.epa.toFixed(1)}</p></div>
							<div class="text-right"><p class="text-[8px] md:text-[10px] font-black text-red-400 uppercase tracking-[0.2em]">OPR</p><p class="text-2xl md:text-4xl font-black text-orange-400">{simAggregates.red.opr.toFixed(1)}</p></div>
						</div>
					</div>
					<div class="space-y-4 md:space-y-6">
						{#each simRedTeams as team, i}
							<SimulatorTeamCard
								{team}
								teamIndex={i}
								alliance="red"
								{getTeamSummary}
								{teamColorsMap}
								{teamDetailsMap}
								onTeamInput={(idx, val) => { simRedTeams[idx] = val; fetchTeamColors(val); }}
								onTeamClick={(t) => handleRowClick({ 'Team #': t })}
								onImageClick={(url) => openImageViewer(url)}
								{getDriveDirectLink}
								{getVal}
							/>
						{/each}
					</div>
				</div>
				<div class="bg-blue-950/10 border-2 border-blue-500/20 rounded-2xl md:rounded-[2rem] p-4 md:p-8 shadow-2xl backdrop-blur-sm">
					<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 md:mb-8">
						<h2 class="text-2xl md:text-3xl font-black text-blue-500 uppercase italic tracking-tighter">Blue Alliance</h2>
						<div class="flex gap-4 md:gap-6">
							<div class="text-right"><p class="text-[8px] md:text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">EPA</p><p class="text-2xl md:text-4xl font-black text-white">{simAggregates.blue.epa.toFixed(1)}</p></div>
							<div class="text-right"><p class="text-[8px] md:text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">OPR</p><p class="text-2xl md:text-4xl font-black text-orange-400">{simAggregates.blue.opr.toFixed(1)}</p></div>
						</div>
					</div>
					<div class="space-y-4 md:space-y-6">
						{#each simBlueTeams as team, i}
							<SimulatorTeamCard
								{team}
								teamIndex={i}
								alliance="blue"
								{getTeamSummary}
								{teamColorsMap}
								{teamDetailsMap}
								onTeamInput={(idx, val) => { simBlueTeams[idx] = val; fetchTeamColors(val); }}
								onTeamClick={(t) => handleRowClick({ 'Team #': t })}
								onImageClick={(url) => openImageViewer(url)}
								{getDriveDirectLink}
								{getVal}
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
							<div class="relative mb-6">
								<input 
									type="text" 
									bind:value={overviewTeam} 
									placeholder="Enter Team #..." 
									class="w-full bg-black/40 border-2 border-zinc-800 rounded-xl p-4 font-black text-white focus:border-purple-500 outline-none transition uppercase"
								/>
							</div>
							
							{#if overviewTeam}
								{@const details = teamDetailsMap.get(overviewTeam)}
								<div class="space-y-4">
									<div class="p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl">
										<p class="text-3xl font-black text-white">{overviewTeam}</p>
										<p class="text-xs font-black text-zinc-500 uppercase tracking-widest truncate">{details?.nickname || 'Unknown Team'}</p>
									</div>
								</div>
							{/if}
						</div>
					</div>

					<!-- Schedule & Status -->
					<div class="flex-1">
						{#if !overviewTeam}
							<div class="h-64 flex flex-col items-center justify-center bg-zinc-900/20 rounded-[2.5rem] border-2 border-zinc-800 border-dashed">
								<p class="text-zinc-600 font-black uppercase tracking-[0.2em]">Select a team to view schedule</p>
							</div>
						{:else if overviewTeamSchedule.length === 0}
							<div class="h-64 flex flex-col items-center justify-center bg-zinc-900/20 rounded-[2.5rem] border-2 border-zinc-800 border-dashed">
								<p class="text-zinc-600 font-black uppercase tracking-[0.2em]">No matches found for Team {overviewTeam}</p>
							</div>
						{:else}
							<div class="grid grid-cols-1 gap-4">
								{#each overviewTeamSchedule as m}
									<div 
										on:click={() => selectedMatchPopup = m}
										role="button"
										tabindex="0"
										on:keydown={(e) => e.key === 'Enter' && (selectedMatchPopup = m)}
										class="group bg-zinc-900/40 border-2 {m.alliance === 'red' ? 'border-red-500/20 hover:border-red-500/40' : 'border-blue-500/20 hover:border-blue-500/40'} rounded-[2rem] p-6 backdrop-blur-xl shadow-xl transition-all relative overflow-hidden cursor-pointer">

										<div class="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
											<div class="flex items-center gap-6">
												<div class="w-20 h-20 rounded-2xl flex flex-col items-center justify-center {m.alliance === 'red' ? 'bg-red-500/10 border-2 border-red-500/20' : 'bg-blue-500/10 border-2 border-blue-500/20'}">
													<p class="text-[10px] font-black {m.alliance === 'red' ? 'text-red-500' : 'text-blue-500'} uppercase">Match</p>
													<p class="text-3xl font-black text-white">{m.match_number}</p>
												</div>
												<div>
													<div class="flex items-center gap-3 mb-3">
														{#if m.isPlayed}
															<span class="text-[10px] font-black text-green-500 uppercase tracking-widest flex items-center gap-1">
																<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" /></svg>
																Played
															</span>
														{:else}
															<span class="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Upcoming</span>
														{/if}
													</div>
													
													<div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
														<!-- Playing With -->
														<div>
															<p class="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Red Alliance</p>
															<div class="grid grid-cols-3 gap-2">
																{#each m.alliances['red'].team_keys as key}
																	{@const tNum = key.replace('frc', '')}
																	<button 
																		on:click|stopPropagation={() => handleRowClick({ 'Team #': tNum })}
																		class="px-3 py-1.5 rounded-lg text-sm font-black {tNum === overviewTeam ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-black/40 text-zinc-300 hover:bg-zinc-800 hover:text-white border-white/5'} border transition-all text-center whitespace-nowrap">
																		{tNum}
																	</button>
																{/each}
															</div>
														</div>
														
														<!-- Playing Against -->
														<div>
															<p class="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Blue Alliance</p>
															<div class="grid grid-cols-3 gap-2">
																{#each m.alliances['blue'].team_keys as key}
																	{@const tNum = key.replace('frc', '')}
																	<button 
																		on:click|stopPropagation={() => handleRowClick({ 'Team #': tNumOpp })}
																		class="px-3 py-1.5 rounded-lg text-sm font-black {tNum === overviewTeam ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-black/40 text-zinc-300 hover:bg-zinc-800 hover:text-white border-white/5'} border transition-all text-center whitespace-nowrap">
																		{tNum}
																	</button>
																{/each}
															</div>
														</div>
													</div>
												</div>
											</div>

											<div class="flex flex-col items-end gap-3">
												{#if m.swapNeeded}
													<div class="flex items-center gap-2 text-orange-400">
														<svg class="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
														<span class="text-xs font-black uppercase tracking-widest">Bumper Swap After Match</span>
													</div>
												{/if}
												<button 
													on:click|stopPropagation={() => loadMatchIntoSimulator(m)}
													class="bg-zinc-800 hover:bg-purple-600 text-white text-[10px] font-black px-6 py-3 rounded-xl transition-all uppercase tracking-[0.2em] shadow-lg active:scale-95 border border-zinc-700">
													Load Into Simulator
												</button>
											</div>
										</div>
									</div>
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
					<section>
						<div class="flex items-center gap-3 md:gap-6 mb-4 md:mb-6">
							<h3 class="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] md:tracking-[0.5em] whitespace-nowrap">Field Observations</h3>
							<div class="h-0.5 flex-1 bg-gradient-to-r from-zinc-800 to-transparent"></div>
						</div>
						<div class="space-y-3 md:space-y-6">
							{#each selectedTeamMatches as matchRow}
								{@const comment = getVal(matchRow, 'comments')}
								{#if comment && comment !== 'N/A'}
									<div class="bg-zinc-900/60 p-3 md:p-8 rounded-lg md:rounded-[2.5rem] border-l-4 md:border-l-8 border-blue-600 shadow-2xl backdrop-blur-sm group hover:border-blue-500 transition-all">
										<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-2 md:mb-4">
											<div class="flex flex-wrap items-center gap-2 md:gap-4">
												<span class="text-[8px] md:text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] md:tracking-[0.3em] bg-blue-500/10 px-2 md:px-4 py-1 md:py-2 rounded-lg md:rounded-xl border border-blue-500/20">Match {getVal(matchRow, 'Match #')}</span>
												<span class="text-[7px] md:text-[8px] font-black text-zinc-600 uppercase tracking-widest">Scout: {getVal(matchRow, 'Scouter initials')}</span>
											</div>
											<button 
												on:click={() => selectTeamMatch(matchRow)}
												class="text-[7px] md:text-[8px] font-black uppercase tracking-widest bg-zinc-800 hover:bg-blue-600 text-zinc-400 hover:text-white px-2 md:px-3 py-1 md:py-1.5 rounded-lg transition active:scale-95 w-fit">
												View Details
											</button>
										</div>
										<p class="font-black text-zinc-200 text-sm md:text-lg leading-relaxed italic tracking-tight break-words">"{comment}"</p>
									</div>
								{/if}
							{/each}
							{#if selectedTeamMatches.filter(m => getVal(m, 'comments') && getVal(m, 'comments') !== 'N/A').length === 0}
								<div class="bg-zinc-900/60 p-6 md:p-10 rounded-lg md:rounded-[3rem] border-l-4 md:border-l-8 border-zinc-800 font-black text-zinc-600 text-sm md:text-xl leading-relaxed shadow-2xl italic tracking-tight backdrop-blur-sm text-center">DIRECT OBSERVATIONS UNAVAILABLE.</div>
							{/if}
						</div>
					</section>
				{/if}
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
