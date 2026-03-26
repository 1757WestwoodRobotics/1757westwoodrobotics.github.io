<script>
	import Navbar from '../../components/navbar.svelte';
	import Footer from '../../components/footer.svelte';
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
	let loading = true;
	let loadingSteps = {
		scoutingData: false,
		pitData: false,
		eventStats: false,
		schedule: false,
		teamStats: false
	};
	let currentStep = '';
	let error = null;
	let searchTerm = '';
	let selectedRow = null;
	let selectedTeamMatches = [];
	let teamStatsMap = new Map(); 
	let teamColorsMap = new Map();
	let teamDetailsMap = new Map();
	let eventOprs = {}; 
	let teamStats = null; 
	let statsLoading = false;
	let pitMode = false;
	let simulatorMode = false;
	let selectionMode = false;
	let defenseMode = false;
	let simRedTeams = ['', '', ''];
	let simBlueTeams = ['', '', ''];

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
							return teamNum && teamNum !== 'N/A' && matchNum && matchNum !== 'N/A';
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
			
			currentStep = 'schedule';
			loadingSteps.schedule = true;
			await fetchSchedule();
			loadingSteps.schedule = false;
			
			currentStep = 'teamStats';
			loadingSteps.teamStats = true;
			await fetchAllTeamStats();
			loadingSteps.teamStats = false;
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

	async function fetchSchedule() {
		try {
			const res = await fetch(`https://www.thebluealliance.com/api/v3/event/${EVENT_KEY}/matches/simple`, {
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

	async function fetchAllTeamStats() {
		const uniqueTeams = Array.from(new Set(scoutingData.map(r => getVal(r, 'Team #')))).filter(t => t && t !== 'N/A');
		const currentYear = 2026;
		let updated = false;

		for (let i = 0; i < uniqueTeams.length; i++) {
			const teamNum = uniqueTeams[i];
			if (teamStatsMap.has(teamNum)) continue;

			try {
				const statRes = await fetch(`https://api.statbotics.io/v3/team_year/${teamNum}/${currentYear}`);
				if (statRes.ok) {
					const data = await statRes.json();
					teamStatsMap.set(teamNum, {
						epa: data?.epa?.total_points?.mean || 0,
						unitless: data?.epa?.unitless || 0,
						norm: data?.epa?.norm || 0
					});
					teamStatsMap = teamStatsMap; 
					updated = true;
				}
			} catch (e) {
				console.error(`Error fetching stats for ${teamNum}:`, e);
			}
		}
		if (updated) saveCache();
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

			teamStats = {
				epa: global.epa || 0,
				rank: global.unitless || 'N/A',
				opr: opr,
				nickname: tbaData?.nickname || `Team ${teamNumber}`,
				city: tbaData?.city || '',
				state: tbaData?.state_prov || '',
				pit: pit
			};
		} catch (e) {
			console.error('Error fetching details:', e);
		} finally {
			statsLoading = false;
		}
	}

	onMount(() => {
		console.log('onMount called, loading:', loading);
		const cached = localStorage.getItem('scouting_cache');
		if (cached) {
			const parsed = JSON.parse(cached);
			const { data, pit, stats, colors, details, timestamp } = parsed;
			console.log('Cache found, age:', Date.now() - timestamp);
			if (Date.now() - timestamp < 3600000) {
				console.log('Cache is fresh, loading from cache');
				scoutingData = data;
				pitData = pit || [];
				if (stats) teamStatsMap = new Map(stats);
				if (colors) teamColorsMap = new Map(colors);
				if (details) teamDetailsMap = new Map(details);
				
				// Still show loading while fetching fresh data
				currentStep = 'eventStats';
				loadingSteps.eventStats = true;
				loading = true;
				fetchEventStats().then(() => {
					loadingSteps.eventStats = false;
					currentStep = 'schedule';
					loadingSteps.schedule = true;
					return fetchSchedule();
				}).then(() => {
					loadingSteps.schedule = false;
					currentStep = 'teamStats';
					loadingSteps.teamStats = true;
					return fetchAllTeamStats();
				}).then(() => {
					loadingSteps.teamStats = false;
					loading = false;
					currentStep = '';
					console.log('All tasks complete, loading:', loading);
				});
				return;
			}
		}
		console.log('No cache or cache expired, fetching fresh data');
		fetchData();
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

	$: teamMetrics = Array.from(new Set(scoutingData.map(r => getVal(r, 'Team #'))))
		.filter(t => t !== 'N/A')
		.map(teamNum => {
			const rows = scoutingData.filter(r => getVal(r, 'Team #') === teamNum);
			const avgEff = rows.reduce((acc, r) => acc + (parseFloat(getVal(r, 'Scoring effectiveness?')) || 0), 0) / rows.length;
			const climbRate = rows.filter(r => {
				const val = getVal(r, 'climb level').toLowerCase();
				return val !== 'no' && val !== 'no climb' && val !== 'f' && val !== 'failed' && val !== 'n/a';
			}).length / rows.length;
			
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
				{ label: 'Feeding Skill', data: teamRows.map(r => parseInt(getVal(r, 'feeding score?')) || 0), borderColor: '#fb923c', backgroundColor: 'rgba(251, 146, 60, 0.5)', tension: 0.3, pointBackgroundColor: '#fb923c', pointRadius: 4 }
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

	function getMatchBreakdown(match) {
		const scoutedTeams = new Set(scoutingData.filter(r => getVal(r, 'Match #') == match.match_number).map(r => getVal(r, 'Team #')));
		return {
			red: match.alliances.red.team_keys.map((key, i) => ({ pos: `R${i+1}`, team: key.replace('frc', ''), scouted: scoutedTeams.has(key.replace('frc', '')) })),
			blue: match.alliances.blue.team_keys.map((key, i) => ({ pos: `B${i+1}`, team: key.replace('frc', ''), scouted: scoutedTeams.has(key.replace('frc', '')) }))
		};
	}

	let hoveredMatch = null;

	$: simAggregates = {
		red: { score: simRedTeams.map(t => getTeamSummary(t)).filter(Boolean).reduce((acc, t) => acc + (t.epa || 0), 0) },
		blue: { score: simBlueTeams.map(t => getTeamSummary(t)).filter(Boolean).reduce((acc, t) => acc + (t.epa || 0), 0) }
	};
</script>

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
				<div class="flex items-center gap-3 p-3 rounded-lg {loadingSteps.scoutingData ? 'bg-blue-600/20 border-2 border-blue-500/50' : 'bg-zinc-900/40 border border-zinc-800'}">
					<div class="flex-shrink-0">
						{#if loadingSteps.scoutingData}
							<div class="w-5 h-5 border-2 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
						{:else}
							<svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
						{/if}
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-black text-white uppercase tracking-widest">Scouting Data</p>
						<p class="text-xs text-zinc-400">{scoutingData.length} entries loaded</p>
					</div>
				</div>

				<div class="flex items-center gap-3 p-3 rounded-lg {loadingSteps.pitData ? 'bg-blue-600/20 border-2 border-blue-500/50' : 'bg-zinc-900/40 border border-zinc-800'}">
					<div class="flex-shrink-0">
						{#if loadingSteps.pitData}
							<div class="w-5 h-5 border-2 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
						{:else}
							<svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
						{/if}
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-black text-white uppercase tracking-widest">Pit Data</p>
						<p class="text-xs text-zinc-400">{pitData.length} teams scouted</p>
					</div>
				</div>

				<div class="flex items-center gap-3 p-3 rounded-lg {loadingSteps.eventStats ? 'bg-blue-600/20 border-2 border-blue-500/50' : 'bg-zinc-900/40 border border-zinc-800'}">
					<div class="flex-shrink-0">
						{#if loadingSteps.eventStats}
							<div class="w-5 h-5 border-2 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
						{:else}
							<svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
						{/if}
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-black text-white uppercase tracking-widest">Event Stats (TBA)</p>
						<p class="text-xs text-zinc-400">OPR & EPA</p>
					</div>
				</div>

				<div class="flex items-center gap-3 p-3 rounded-lg {loadingSteps.schedule ? 'bg-blue-600/20 border-2 border-blue-500/50' : 'bg-zinc-900/40 border border-zinc-800'}">
					<div class="flex-shrink-0">
						{#if loadingSteps.schedule}
							<div class="w-5 h-5 border-2 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
						{:else}
							<svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
						{/if}
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-black text-white uppercase tracking-widest">Match Schedule</p>
						<p class="text-xs text-zinc-400">{schedule.length} matches</p>
					</div>
				</div>

				<div class="flex items-center gap-3 p-3 rounded-lg {loadingSteps.teamStats ? 'bg-blue-600/20 border-2 border-blue-500/50' : 'bg-zinc-900/40 border border-zinc-800'}">
					<div class="flex-shrink-0">
						{#if loadingSteps.teamStats}
							<div class="w-5 h-5 border-2 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
						{:else}
							<svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
						{/if}
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-black text-white uppercase tracking-widest">Team Analytics</p>
						<p class="text-xs text-zinc-400">{teamStatsMap.size} teams indexed</p>
					</div>
				</div>
			</div>

			<!-- Loading Message -->
			<div class="text-center">
				<p class="text-xs font-black text-zinc-500 uppercase tracking-widest">Processing competition data...</p>
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
				<button on:click={() => { defenseMode = !defenseMode; if(defenseMode) { simulatorMode = false; pitMode = false; selectionMode = false; } }} class="px-3 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition border-2 whitespace-nowrap {defenseMode ? 'bg-red-600 border-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white'}">Defense</button>
				<button on:click={() => { pitMode = false; simulatorMode = false; selectionMode = false; defenseMode = false; }} class="px-3 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition border-2 whitespace-nowrap {!pitMode && !simulatorMode && !selectionMode && !defenseMode ? 'bg-green-600 border-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.4)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white'}">
					<span class="hidden sm:inline">All Data</span>
					<span class="sm:hidden">All</span>
				</button>
			</div>
		</div>

		<!-- Match Coverage Map -->
		<section class="mb-12 bg-zinc-900/30 border border-zinc-800 p-6 rounded-[2rem] backdrop-blur-sm relative">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Quals Coverage Map</h3>
				<div class="flex gap-4 text-[8px] font-bold uppercase text-zinc-600">
					<div class="flex items-center gap-1"><div class="w-2 h-2 bg-blue-600 rounded-sm"></div> Full (6)</div>
					<div class="flex items-center gap-1"><div class="w-2 h-2 bg-blue-900/40 rounded-sm"></div> Partial</div>
					<div class="flex items-center gap-1"><div class="w-2 h-2 bg-zinc-800 rounded-sm"></div> Missing</div>
				</div>
			</div>
			<div class="flex flex-wrap gap-1.5">
				{#each schedule as match}
					{@const count = getScouterCount(match.match_number)}
					<div class="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all border cursor-help relative {count >= 6 ? 'bg-blue-600 border-blue-400 text-white' : count > 0 ? 'bg-blue-900/40 border-blue-700 text-blue-300' : 'bg-zinc-900 border-zinc-800 text-zinc-700'}" 
						role="button"
						tabindex="0"
						on:mouseenter={() => hoveredMatch = match} 
						on:mouseleave={() => hoveredMatch = null}
						on:focus={() => hoveredMatch = match}
						on:blur={() => hoveredMatch = null}
						on:keydown={(e) => e.key === 'Enter' && (hoveredMatch = hoveredMatch === match ? null : match)}>
						{match.match_number}
						{#if hoveredMatch === match}
							<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[110] animate-in fade-in zoom-in-95 duration-150">
								<div class="bg-zinc-900 border-2 border-zinc-800 p-4 rounded-2xl shadow-2xl min-w-[200px]">
									<p class="text-[10px] font-black text-white uppercase tracking-widest mb-3 border-b border-zinc-800 pb-2">Match {match.match_number} Breakdown</p>
									<div class="grid grid-cols-2 gap-4">
										<div class="space-y-1.5">
											<p class="text-[8px] font-black text-red-500 uppercase tracking-tighter mb-1">Red</p>
											{#each getMatchBreakdown(match).red as t}
												<div class="flex justify-between items-center gap-3">
													<span class="text-[9px] font-bold text-zinc-500">{t.pos}</span>
													<span class="text-[10px] font-black {t.scouted ? 'text-white' : 'text-zinc-700 line-through'}">{t.team}</span>
													<div class="w-1.5 h-1.5 rounded-full {t.scouted ? 'bg-green-500' : 'bg-red-900'}"></div>
												</div>
											{/each}
										</div>
										<div class="space-y-1.5">
											<p class="text-[8px] font-black text-blue-500 uppercase tracking-tighter mb-1">Blue</p>
											{#each getMatchBreakdown(match).blue as t}
												<div class="flex justify-between items-center gap-3">
													<span class="text-[9px] font-bold text-zinc-500">{t.pos}</span>
													<span class="text-[10px] font-black {t.scouted ? 'text-white' : 'text-zinc-700 line-through'}">{t.team}</span>
													<div class="w-1.5 h-1.5 rounded-full {t.scouted ? 'bg-green-500' : 'bg-red-900'}"></div>
												</div>
											{/each}
										</div>
									</div>
								</div>
								<div class="w-2 h-2 bg-zinc-900 border-r-2 border-b-2 border-zinc-800 rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2"></div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</section>

		{#if pitMode}
			<div class="animate-in fade-in slide-in-from-top-4 mb-12">
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{#each pitData.filter(p => !searchTerm || getVal(p, 'Team number').includes(searchTerm)).sort((a,b) => parseInt(getVal(a, 'Team number')) - parseInt(getVal(b, 'Team number'))) as pit}
						{@const colors = teamColorsMap.get(getVal(pit, 'Team number')) || { primary: '#3b82f6', secondary: '#1e40af' }}
						<div class="bg-zinc-900/40 border-2 border-zinc-800 rounded-xl md:rounded-[2.5rem] p-3 md:p-6 hover:border-zinc-700 transition-all group cursor-pointer overflow-hidden relative shadow-2xl" 
							style="--team-primary: {colors.primary}; --team-secondary: {colors.secondary}"
							role="button"
							tabindex="0"
							on:click={() => handleRowClick({ 'Team #': getVal(pit, 'Team number') })}
							on:keydown={(e) => e.key === 'Enter' && handleRowClick({ 'Team #': getVal(pit, 'Team number') })}>
							<div class="flex justify-between items-start mb-4 md:mb-6">
								<div>
									<h2 class="text-3xl md:text-5xl font-black text-white group-hover:text-[var(--team-primary)] transition-colors">{getVal(pit, 'Team number')}</h2>
									<p class="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mt-1">{getVal(pit, 'Drive Train Type')}</p>
								</div>
								{#if getVal(pit, 'Under trench?') === 'Yes' || getVal(pit, 'Over bump?') === 'Yes'}
									<div class="flex gap-1.5">
										{#if getVal(pit, 'Under trench?') === 'Yes'} <div class="w-3 h-3 rounded-full shadow-lg" style="background: var(--team-primary)" title="Under Trench"></div> {/if}
										{#if getVal(pit, 'Over bump?') === 'Yes'} <div class="w-3 h-3 rounded-full shadow-lg" style="background: var(--team-secondary)" title="Over Bump"></div> {/if}
									</div>
								{/if}
							</div>

							{#if getDriveDirectLink(getVal(pit, 'Bot pic'))}
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
							{/if}

							<div class="space-y-4">
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
								<div class="bg-black/40 p-3 rounded-2xl border border-white/5">
									<p class="text-[8px] font-black text-zinc-500 uppercase mb-1">Best Auto</p>
									<p class="text-[10px] font-black text-zinc-300 italic">"{getVal(pit, 'Best Auto') || 'N/A'}"</p>
								</div>
							</div>
							
							<div class="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-700 pointer-events-none">
								<h1 class="text-9xl font-black italic">{getVal(pit, 'Team number')}</h1>
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
						<div class="text-right"><p class="text-[8px] md:text-[10px] font-black text-red-400 uppercase tracking-[0.2em]">Alliance EPA</p><p class="text-2xl md:text-5xl font-black text-white">{simAggregates.red.score.toFixed(1)}</p></div>
					</div>
					<div class="space-y-4 md:space-y-6">
						{#each simRedTeams as team, i}
							<div class="flex flex-col gap-3">
								<input type="text" bind:value={simRedTeams[i]} on:input={() => fetchTeamColors(simRedTeams[i])} placeholder="Team #" class="w-full bg-black/60 border-2 border-red-500/30 rounded-xl p-3 text-center font-black text-base md:text-lg focus:border-red-500 outline-none transition" />
								{#if getTeamSummary(simRedTeams[i])}
									{@const s = getTeamSummary(simRedTeams[i])}
									{@const colors = teamColorsMap.get(simRedTeams[i]) || { primary: '#ef4444', secondary: '#991b1b' }}
									<div class="bg-zinc-900/60 rounded-2xl border-2 border-zinc-800 p-4 md:p-5 hover:border-zinc-700 transition-all group cursor-pointer overflow-hidden relative" 
										style="--team-primary: {colors.primary}; --team-secondary: {colors.secondary}"
										role="button"
										tabindex="0"
										on:click={() => handleRowClick({ 'Team #': simRedTeams[i] })}
										on:keydown={(e) => e.key === 'Enter' && handleRowClick({ 'Team #': simRedTeams[i] })}>
										
										<div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3 relative z-10">
											<div>
												<div class="flex items-center gap-2 flex-wrap">
													<span class="text-xl md:text-2xl font-black text-white group-hover:text-[var(--team-primary)] transition-colors">{simRedTeams[i]}</span>
													<span class="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">{teamDetailsMap.get(simRedTeams[i])?.nickname || ''}</span>
												</div>
												<div class="flex gap-3 md:gap-4 mt-2 text-xs md:text-sm">
													<div class="flex flex-col"><span class="text-[7px] md:text-[8px] font-black text-zinc-500 uppercase">EPA</span><span class="font-black text-blue-400">{s.epa.toFixed(1)}</span></div>
													<div class="flex flex-col"><span class="text-[7px] md:text-[8px] font-black text-zinc-500 uppercase">Climb</span><span class="font-black text-purple-400">{(s.climbRate*100).toFixed(0)}%</span></div>
												</div>
											</div>
											{#if s.pit && getDriveDirectLink(getVal(s.pit, 'Bot pic'))}
												<div class="w-16 h-16 md:w-20 md:h-20 rounded-lg md:rounded-xl overflow-hidden border border-white/10 shadow-lg bg-black/40 cursor-zoom-in hover:border-red-500 transition-colors flex-shrink-0"
													role="button"
													tabindex="0"
													on:click|stopPropagation={() => openImageViewer(getDriveDirectLink(getVal(s.pit, 'Bot pic')))}
													on:keydown={(e) => e.key === 'Enter' && openImageViewer(getDriveDirectLink(getVal(s.pit, 'Bot pic')))}>
													<img src={getDriveDirectLink(getVal(s.pit, 'Bot pic'))} alt="Bot" class="w-full h-full object-contain" />
												</div>
											{/if}
										</div>

										{#if s.pit}
											<div class="grid grid-cols-2 gap-2 md:gap-3 relative z-10">
												<div class="bg-black/40 p-2 rounded-lg md:rounded-xl border border-white/5 text-[7px] md:text-[8px]">
													<p class="font-black text-zinc-500 uppercase mb-0.5">Drivetrain</p>
													<p class="font-black text-white truncate">{getVal(s.pit, 'Drive Train Type')}</p>
												</div>
												<div class="bg-black/40 p-2 rounded-lg md:rounded-xl border border-white/5 text-[7px] md:text-[8px]">
													<p class="font-black text-zinc-500 uppercase mb-0.5">Best Auto</p>
													<p class="font-black text-zinc-300 truncate italic">"{getVal(s.pit, 'Best Auto')}"</p>
												</div>
											</div>
										{/if}
										<div class="absolute -right-2 -bottom-2 opacity-5 pointer-events-none text-2xl md:text-6xl font-black italic">{simRedTeams[i]}</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
				<div class="bg-blue-950/10 border-2 border-blue-500/20 rounded-2xl md:rounded-[2rem] p-4 md:p-8 shadow-2xl backdrop-blur-sm">
					<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 md:mb-8">
						<h2 class="text-2xl md:text-3xl font-black text-blue-500 uppercase italic tracking-tighter">Blue Alliance</h2>
						<div class="text-right"><p class="text-[8px] md:text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Alliance EPA</p><p class="text-2xl md:text-5xl font-black text-white">{simAggregates.blue.score.toFixed(1)}</p></div>
					</div>
					<div class="space-y-4 md:space-y-6">
						{#each simBlueTeams as team, i}
							<div class="flex flex-col gap-3">
								<input type="text" bind:value={simBlueTeams[i]} on:input={() => fetchTeamColors(simBlueTeams[i])} placeholder="Team #" class="w-full bg-black/60 border-2 border-blue-500/30 rounded-xl p-3 text-center font-black text-base md:text-lg focus:border-blue-500 outline-none transition" />
								{#if getTeamSummary(simBlueTeams[i])}
									{@const s = getTeamSummary(simBlueTeams[i])}
									{@const colors = teamColorsMap.get(simBlueTeams[i]) || { primary: '#3b82f6', secondary: '#1e40af' }}
									<div class="bg-zinc-900/60 rounded-2xl border-2 border-zinc-800 p-4 md:p-5 hover:border-zinc-700 transition-all group cursor-pointer overflow-hidden relative" 
										style="--team-primary: {colors.primary}; --team-secondary: {colors.secondary}"
										role="button"
										tabindex="0"
										on:click={() => handleRowClick({ 'Team #': simBlueTeams[i] })}
										on:keydown={(e) => e.key === 'Enter' && handleRowClick({ 'Team #': simBlueTeams[i] })}>
										
										<div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3 relative z-10">
											<div>
												<div class="flex items-center gap-2 flex-wrap">
													<span class="text-xl md:text-2xl font-black text-white group-hover:text-[var(--team-primary)] transition-colors">{simBlueTeams[i]}</span>
													<span class="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">{teamDetailsMap.get(simBlueTeams[i])?.nickname || ''}</span>
												</div>
												<div class="flex gap-3 md:gap-4 mt-2 text-xs md:text-sm">
													<div class="flex flex-col"><span class="text-[7px] md:text-[8px] font-black text-zinc-500 uppercase">EPA</span><span class="font-black text-blue-400">{s.epa.toFixed(1)}</span></div>
													<div class="flex flex-col"><span class="text-[7px] md:text-[8px] font-black text-zinc-500 uppercase">Climb</span><span class="font-black text-purple-400">{(s.climbRate*100).toFixed(0)}%</span></div>
												</div>
											</div>
											{#if s.pit && getDriveDirectLink(getVal(s.pit, 'Bot pic'))}
												<div class="w-16 h-16 md:w-20 md:h-20 rounded-lg md:rounded-xl overflow-hidden border border-white/10 shadow-lg bg-black/40 cursor-zoom-in hover:border-blue-500 transition-colors flex-shrink-0"
													role="button"
													tabindex="0"
													on:click|stopPropagation={() => openImageViewer(getDriveDirectLink(getVal(s.pit, 'Bot pic')))}
													on:keydown={(e) => e.key === 'Enter' && openImageViewer(getDriveDirectLink(getVal(s.pit, 'Bot pic')))}>
													<img src={getDriveDirectLink(getVal(s.pit, 'Bot pic'))} alt="Bot" class="w-full h-full object-contain" />
												</div>
											{/if}
										</div>

										{#if s.pit}
											<div class="grid grid-cols-2 gap-2 md:gap-3 relative z-10">
												<div class="bg-black/40 p-2 rounded-lg md:rounded-xl border border-white/5 text-[7px] md:text-[8px]">
													<p class="font-black text-zinc-500 uppercase mb-0.5">Drivetrain</p>
													<p class="font-black text-white truncate">{getVal(s.pit, 'Drive Train Type')}</p>
												</div>
												<div class="bg-black/40 p-2 rounded-lg md:rounded-xl border border-white/5 text-[7px] md:text-[8px]">
													<p class="font-black text-zinc-500 uppercase mb-0.5">Best Auto</p>
													<p class="font-black text-zinc-300 truncate italic">"{getVal(s.pit, 'Best Auto')}"</p>
												</div>
											</div>
										{/if}
										<div class="absolute -right-2 -bottom-2 opacity-5 pointer-events-none text-2xl md:text-6xl font-black italic">{simBlueTeams[i]}</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			</div>
		{:else if selectionMode}
			<div class="animate-in fade-in slide-in-from-top-4 mb-12">
				<!-- Desktop Table -->
				<div class="hidden md:block bg-zinc-900/40 rounded-[2.5rem] border-2 border-orange-500/20 shadow-2xl backdrop-blur-xl overflow-x-auto">
					<table class="w-full text-left border-separate border-spacing-0">
						<thead>
							<tr class="bg-orange-950/20 text-orange-400 text-[10px] font-black uppercase tracking-[0.3em]">
								<th class="p-8 border-b-2 border-zinc-800 cursor-pointer hover:text-white" on:click={() => handleSort('Team #')}>Team {sortKey === 'Team #' ? (sortOrder === 1 ? '↑' : '↓') : ''}</th>
								<th class="p-8 border-b-2 border-zinc-800 cursor-pointer hover:text-white text-center" on:click={() => handleSort('EPA')}>EPA (Statbotics) {sortKey === 'EPA' ? (sortOrder === 1 ? '↑' : '↓') : ''}</th>
								<th class="p-8 border-b-2 border-zinc-800 cursor-pointer hover:text-white text-center" on:click={() => handleSort('OPR')}>OPR (TBA) {sortKey === 'OPR' ? (sortOrder === 1 ? '↑' : '↓') : ''}</th>
								<th class="p-8 border-b-2 border-zinc-800 cursor-pointer hover:text-white text-center" on:click={() => handleSort('Avg Eff.')}>Avg Eff. {sortKey === 'Avg Eff.' ? (sortOrder === 1 ? '↑' : '↓') : ''}</th>
								<th class="p-8 border-b-2 border-zinc-800 cursor-pointer hover:text-white text-center" on:click={() => handleSort('Climb Rate')}>Climb Rate {sortKey === 'Climb Rate' ? (sortOrder === 1 ? '↑' : '↓') : ''}</th>
								<th class="p-8 border-b-2 border-zinc-800 cursor-pointer hover:text-white text-center" on:click={() => handleSort('Samples')}>Samples {sortKey === 'Samples' ? (sortOrder === 1 ? '↑' : '↓') : ''}</th>
								<th class="p-8 border-b-2 border-zinc-800">Intelligence</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-zinc-800">
							{#each sortedLeaderboard as m}
								<tr class="hover:bg-orange-500/10 transition-all duration-300 cursor-pointer group" on:click={() => handleRowClick({ 'Team #': m.teamNum })}>
									<td class="p-2 md:p-8 font-black text-white text-xl md:text-4xl group-hover:pl-4 md:group-hover:pl-12 transition-all">{m.teamNum}</td>
									<td class="p-8 text-center"><span class="text-3xl font-black text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">{m.epa.toFixed(1)}</span></td>
									<td class="p-8 text-center"><span class="text-3xl font-black text-zinc-300">{m.opr.toFixed(1)}</span></td>
									<td class="p-8 text-center"><span class="text-3xl font-black text-orange-400">{m.avgEff.toFixed(1)}</span></td>
									<td class="p-8 text-center"><span class="text-2xl font-black {m.climbRate > 0.7 ? 'text-purple-400' : 'text-zinc-600'}">{(m.climbRate * 100).toFixed(0)}%</span></td>
									<td class="p-8 text-center"><span class="text-xs font-black text-zinc-500 uppercase tracking-widest">{m.entryCount} matches</span></td>
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
					{#each sortedLeaderboard as m}
						<div class="bg-zinc-900/40 border-2 border-orange-500/20 rounded-2xl p-4 shadow-xl backdrop-blur-xl cursor-pointer hover:border-orange-500/40 transition-all" on:click={() => handleRowClick({ 'Team #': m.teamNum })}>
							<div class="flex justify-between items-start gap-3 mb-3">
								<div class="flex-1">
									<p class="text-2xl font-black text-orange-400">{m.teamNum}</p>
									<p class="text-xs text-zinc-500 font-black uppercase mt-1">{m.entryCount} matches</p>
								</div>
								<button on:click|stopPropagation={() => handleRowClick({ 'Team #': m.teamNum })} class="bg-zinc-800 hover:bg-orange-600 text-white text-[9px] font-black px-3 py-1.5 rounded-lg transition uppercase tracking-widest flex-shrink-0">View</button>
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
									<td class="p-8 font-black text-red-400 text-3xl group-hover:pl-12 transition-all">{m.teamNum}</td>
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
								<td class="p-6 font-black text-blue-400 text-2xl group-hover:pl-10 transition-all">{getVal(row, 'Team #')}</td>
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
	<div class="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-2 md:p-4 bg-black/95 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200" 
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
						<div class="bg-blue-600/5 border-2 border-blue-500/20 p-4 md:p-8 rounded-xl md:rounded-[2rem] shadow-xl group hover:border-blue-500 transition-all duration-500">
							<p class="text-[8px] md:text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-2 md:mb-3">Predicted Power (EPA)</p>
							<p class="text-xl md:text-5xl font-black text-white">{teamStats?.epa?.toFixed(1) || '...'}</p>
						</div>
						<div class="bg-purple-600/5 border-2 border-purple-500/20 p-4 md:p-8 rounded-xl md:rounded-[2rem] shadow-xl group hover:border-purple-500 transition-all duration-500">
							<p class="text-[8px] md:text-[10px] font-black text-purple-500 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-2 md:mb-3">Unitless Global Rank</p>
							<p class="text-xl md:text-5xl font-black text-white">{teamStats?.rank || '...'}</p>
						</div>
						<div class="bg-orange-600/5 border-2 border-orange-500/20 p-4 md:p-8 rounded-xl md:rounded-[2rem] shadow-xl group hover:border-orange-500 transition-all duration-500">
							<p class="text-[8px] md:text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-2 md:mb-3">Event OPR (TBA)</p>
							<p class="text-xl md:text-5xl font-black text-white">{teamStats?.opr?.toFixed(1) || '0.0'}</p>
						</div>
					</div>
				{/if}

				{#if teamStats?.pit}
					<section>
						<div class="flex items-center gap-3 md:gap-6 mb-4 md:mb-8">
							<h3 class="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] md:tracking-[0.5em] whitespace-nowrap">Pit Intelligence</h3>
							<div class="h-0.5 flex-1 bg-gradient-to-r from-zinc-800 to-transparent"></div>
						</div>
						<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
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
								<p class="text-[7px] md:text-[8px] font-black text-zinc-500 uppercase mb-0.5 md:mb-1">Best Auto</p>
								<p class="text-[8px] md:text-[10px] font-bold text-zinc-300 italic truncate">"{getVal(teamStats.pit, 'Best Auto')}"</p>
							</div>
						</div>
					</section>
				{/if}

				{#if !pitMode}
					<div class="bg-black/60 p-4 md:p-10 rounded-xl md:rounded-[3rem] border-2 border-zinc-900 h-48 md:h-96 shadow-inner relative group overflow-hidden">
						<div class="absolute top-2 md:top-6 left-3 md:left-10 text-[8px] md:text-[10px] font-black uppercase text-zinc-700 group-hover:text-zinc-500 transition-colors tracking-widest z-10">Performance Velocity</div>
						<Line data={getChartData(getVal(selectedRow, 'Team #'))} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 5, ticks: { color: '#3f3f46', font: { weight: 'black', size: 8 } }, grid: { color: '#18181b' } }, x: { ticks: { color: '#3f3f46', font: { weight: 'black', size: 8 } }, grid: { display: false } } }, plugins: { legend: { position: 'top', align: 'end', labels: { color: '#71717a', font: { weight: 'black', size: 8 }, usePointStyle: true, padding: 15 } } } }} />
					</div>
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

<Footer />

<style>
	:global(body) { background-color: #050505; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
	::-webkit-scrollbar { width: 8px; }
	::-webkit-scrollbar-track { background: #050505; }
	::-webkit-scrollbar-thumb { background: #18181b; border-radius: 10px; }
	::-webkit-scrollbar-thumb:hover { background: #27272a; }
	.shadow-inner { box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.6); }
</style>
