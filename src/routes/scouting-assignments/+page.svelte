<script>
	import Navbar from '../../components/navbar.svelte';
	import Footer from '../../components/footer.svelte';
	import { onMount } from 'svelte';

	let scouts = [];
	let schedule = [];
	let eventTeams = [];
	let assignments = [];
	let loading = true;
	let error = null;
	let selectedScout = null;
	let scoutMatches = [];
	let cacheAge = null;
	let eventStartTime = null;
	let eventTimeZone = 'UTC'; // Will be set from environment or event data

	const SCOUTS_CSV_URL = import.meta.env.VITE_SCOUTS_CSV_URL;
	const TBA_KEY = import.meta.env.VITE_TBA_KEY;
	const EVENT_KEY = import.meta.env.VITE_EVENT_KEY || '2026rikin';
	const CURRENT_YEAR = 2026;

	function parseCsv(text) {
		const rows = [];
		let currentRow = [];
		let currentField = '';
		let inQuotes = false;

		for (let i = 0; i < text.length; i++) {
			const char = text[i];
			const nextChar = text[i + 1];

			if (char === '"') {
				if (inQuotes && nextChar === '"') {
					currentField += '"';
					i++;
				} else {
					inQuotes = !inQuotes;
				}
			} else if (char === ',' && !inQuotes) {
				currentRow.push(currentField.trim());
				currentField = '';
			} else if ((char === '\n' || char === '\r') && !inQuotes) {
				if (currentField || currentRow.length > 0) {
					currentRow.push(currentField.trim());
					if (currentRow.some(f => f)) {
						rows.push(currentRow);
					}
					currentRow = [];
					currentField = '';
				}
				if (char === '\r' && nextChar === '\n') i++;
			} else {
				currentField += char;
			}
		}

		if (currentField || currentRow.length > 0) {
			currentRow.push(currentField.trim());
			if (currentRow.some(f => f)) rows.push(currentRow);
		}

		if (rows.length === 0) return [];

		const headers = rows[0];
		const data = rows.slice(1).map(row => {
			const obj = {};
			headers.forEach((header, i) => {
				obj[header] = row[i] || '';
			});
			return obj;
		});

		return data;
	}

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

	function saveCache() {
		if (typeof window !== 'undefined') {
			localStorage.setItem('scouting_assignments_cache', JSON.stringify({
				scouts: scouts,
				schedule: schedule,
				eventTeams: eventTeams,
				assignments: assignments,
				eventStartTime: eventStartTime,
				timestamp: Date.now()
			}));
		}
	}

	function loadCache() {
		if (typeof window !== 'undefined') {
			const cached = localStorage.getItem('scouting_assignments_cache');
			if (cached) {
				try {
					const parsed = JSON.parse(cached);
					const { scouts: cachedScouts, schedule: cachedSchedule, eventTeams: cachedTeams, assignments: cachedAssignments, eventStartTime: cachedEventStartTime, timestamp } = parsed;
					const age = Date.now() - timestamp;
					cacheAge = Math.floor(age / 60000); // Convert to minutes

					if (age < 3600000) { // Cache valid for 1 hour
						scouts = cachedScouts || [];
						schedule = cachedSchedule || [];
						eventTeams = cachedTeams || [];
						assignments = cachedAssignments || [];
						eventStartTime = cachedEventStartTime || null;
						return true;
					}
				} catch (e) {
					console.error('Error loading cache:', e);
				}
			}
		}
		return false;
	}

	async function fetchScouts() {
		try {
			const res = await fetch(SCOUTS_CSV_URL);
			if (res.ok) {
				const text = await res.text();
				const data = parseCsv(text);
				scouts = data.map(row => ({
					name: getVal(row, 'Scout') || getVal(row, 'Scout Name') || '',
					day1Start: getVal(row, 'Start avail day 1') || '',
					day1End: getVal(row, 'End avail day 1') || '',
					day2Start: getVal(row, 'Start avail day 2') || '',
					day2End: getVal(row, 'End avail day 2') || ''
				})).filter(s => s.name);
				console.log('Loaded scouts:', scouts);
			}
		} catch (e) {
			console.error('Error fetching scouts:', e);
			error = 'Failed to load scouts data';
		}
	}

	async function fetchEventDetails() {
		try {
			const res = await fetch(`https://www.thebluealliance.com/api/v3/event/${EVENT_KEY}`, {
				headers: { 'X-TBA-Auth-Key': TBA_KEY }
			});
			if (res.ok) {
				const data = await res.json();
				eventStartTime = data.start_date ? new Date(data.start_date).getTime() / 1000 : null;
				console.log('Event start time:', new Date(eventStartTime * 1000));
			}
		} catch (e) {
			console.error('Error fetching event details:', e);
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
				console.log('Loaded schedule:', schedule.length, 'matches');
			}
		} catch (e) {
			console.error('Error fetching schedule:', e);
			// Generate synthetic schedule if TBA fails
			generateSyntheticSchedule();
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
				console.log('Loaded event teams:', eventTeams.length);
			}
		} catch (e) {
			console.error('Error fetching event teams:', e);
		}
	}

	function generateSyntheticSchedule() {
		if (eventTeams.length === 0) return;

		const matches = [];
		const teamsPerMatch = 6;
		const numMatches = Math.ceil(eventTeams.length * 2 / teamsPerMatch);

		let teamIndex = 0;
		for (let i = 1; i <= numMatches; i++) {
			const redTeams = [];
			const blueTeams = [];

			for (let j = 0; j < 3; j++) {
				redTeams.push({
					team_key: `frc${eventTeams[teamIndex % eventTeams.length]}`,
					position: j + 1
				});
				teamIndex++;
			}

			for (let j = 0; j < 3; j++) {
				blueTeams.push({
					team_key: `frc${eventTeams[teamIndex % eventTeams.length]}`,
					position: j + 1
				});
				teamIndex++;
			}

			matches.push({
				match_number: i,
				comp_level: 'qm',
				alliances: {
					red: {
						team_keys: redTeams.map(t => t.team_key),
						teams: redTeams
					},
					blue: {
						team_keys: blueTeams.map(t => t.team_key),
						teams: blueTeams
					}
				}
			});
		}

		schedule = matches;
		console.log('Generated synthetic schedule:', matches.length, 'matches');
	}

	function getDateStringLocal(dateStr) {
		// Parse a date string like "4/4/2026 9:00:00" and extract just the date
		// We need to be very careful to interpret it as local time, not UTC
		// Split on space to get just the date part
		const datePart = dateStr.split(' ')[0]; // "4/4/2026"
		const [month, day, year] = datePart.split('/');
		// Return in consistent YYYY-MM-DD format
		return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
	}

	function parseTimeRange(timeStr) {
		if (!timeStr || timeStr.trim() === '') return null;
		// Parse time strings like "4/4/2026 8:00:00"
		// IMPORTANT: Treat input times as LOCAL (entered by users in their timezone)
		// Returns time in minutes since midnight in LOCAL timezone
		try {
			// Extract just the time part and parse it
			const timePart = timeStr.split(' ')[1]; // "8:00:00"
			const [hours, minutes] = timePart.split(':');
			return parseInt(hours) * 60 + parseInt(minutes);
		} catch (e) {
			return null;
		}
	}

	function getScoutAvailabilityWindows(scout) {
		const windows = [];
		
		// Check Day 1 availability
		if (scout.day1Start && scout.day1Start !== 'N/A' && scout.day1End && scout.day1End !== 'N/A') {
			const startMin = parseTimeRange(scout.day1Start);
			const endMin = parseTimeRange(scout.day1End);
			if (startMin !== null && endMin !== null) {
				windows.push({
					day: 1,
					startTime: scout.day1Start,
					endTime: scout.day1End,
					startMin,
					endMin,
					startDate: getDateStringLocal(scout.day1Start),
					endDate: getDateStringLocal(scout.day1End)
				});
			}
		}

		// Check Day 2 availability
		if (scout.day2Start && scout.day2Start !== 'N/A' && scout.day2End && scout.day2End !== 'N/A') {
			const startMin = parseTimeRange(scout.day2Start);
			const endMin = parseTimeRange(scout.day2End);
			if (startMin !== null && endMin !== null) {
				windows.push({
					day: 2,
					startTime: scout.day2Start,
					endTime: scout.day2End,
					startMin,
					endMin,
					startDate: getDateStringLocal(scout.day2Start),
					endDate: getDateStringLocal(scout.day2End)
				});
			}
		}

		return windows;
	}

	function isScoutAvailableForMatch(scout, match, eventStartTime) {
		const windows = getScoutAvailabilityWindows(scout);
		if (windows.length === 0) return false;

		// Get match time from TBA (predicted_time is unix timestamp in UTC)
		if (!match.predicted_time) return false;

		// Convert UTC timestamp to local time for comparison
		// This ensures we compare the actual local times that scouts see
		const matchTime = new Date(match.predicted_time * 1000);
    console.log(matchTime.toString(), 'match time in local timezone');
    console.log(windows, 'scout availability windows');
		
		// Get match time in minutes since midnight (local timezone)
		const matchMinutes = matchTime.getHours() * 60 + matchTime.getMinutes();
		// const matchDateStr = getDateStringLocal(matchTime);
    const matchDateStr = `${matchTime.getFullYear()}-${String(matchTime.getMonth() + 1).padStart(2, '0')}-${String(matchTime.getDate()).padStart(2, '0')}`;

		// Check each window to see if this match falls within it
		for (const window of windows) {
			// Check if match date matches the window date
      console.log(window.startDate, window.endDate, matchDateStr, 'checking dates');
			if (window.startDate === matchDateStr || window.endDate === matchDateStr) {
				// Match is on the same day as this window, check time
				if (matchMinutes >= window.startMin && matchMinutes <= window.endMin) {
					return true;
				}
			}
		}

		return false;
	}

	function generateAssignments() {
		if (scouts.length === 0 || schedule.length === 0) {
			error = 'Need both scouts and schedule to generate assignments';
			return;
		}

		const newAssignments = [];
		const scoutAssignmentCounts = new Map();

		// Initialize assignment counts for each scout
		scouts.forEach(scout => {
			scoutAssignmentCounts.set(scout.name, 0);
		});

    const batchSize = 5; // Process matches in batches to give scouts longer breaks
    const batches = [];
    for (let i = 0; i < schedule.length; i += batchSize) {
      batches.push(schedule.slice(i, i + batchSize));
    }
    console.log(batches)
    batches.forEach(batch => {

      const matchNums = batch.map(m => m.match_number);

      const redPositions = [{
        alliance: 'red',
        position: 1,
      }, {
        alliance: 'red',
        position: 2,
      }, {
        alliance: 'red',
        position: 3,
      }];
      const bluePositions = [
        {
          alliance: 'blue',
          position: 1,
        }, {
          alliance: 'blue',
          position: 2,
        }, {
          alliance: 'blue',
          position: 3,
        }
      ];

      const allPositions = [...redPositions, ...bluePositions];

      const firstMatch = batch[0];
      const lastMatch = batch[batch.length - 1];

      const availableScouts = scouts.filter(scout => {
        // If we have event start time and predicted match time, check actual availability
        if (eventStartTime && firstMatch.predicted_time) {
          return isScoutAvailableForMatch(scout, firstMatch, eventStartTime) && isScoutAvailableForMatch(scout, lastMatch, eventStartTime);
        }
        // Fallback: just check if scout has any availability window
        const windows = getScoutAvailabilityWindows(scout);
        return windows.length > 0;
      });

      // Assign scouts to positions in this batch using round-robin based on counts
      allPositions.forEach((pos, posIdx) => {
        if (availableScouts.length === 0) return;

        // Pick scout with fewest assignments
        const assignedScout = availableScouts.reduce((least, scout) => {
          const leastCount = scoutAssignmentCounts.get(least.name) || 0;
          const scoutCount = scoutAssignmentCounts.get(scout.name) || 0;
          return scoutCount < leastCount ? scout : least;
        });

        if (assignedScout) {
          batch.forEach(match => {
            const teamKey = pos.alliance === 'red' ? match.alliances.red.team_keys[pos.position - 1] : match.alliances.blue.team_keys[pos.position - 1];
            newAssignments.push({
              matchNum: match.match_number,
              scout: assignedScout.name,
              alliance: pos.alliance,
              position: pos.position,
              teamNum: teamKey.replace('frc', '')
            });
          });

          // Update count for this scout
          scoutAssignmentCounts.set(assignedScout.name, (scoutAssignmentCounts.get(assignedScout.name) || 0) + batch.length);
        }
      });

    });


//		// Assign scouts to positions
//		schedule.forEach(match => {
//			const redPositions = [];
//			const bluePositions = [];
//
//			// Get all positions in this match
//			match.alliances.red.team_keys.forEach((key, idx) => {
//				redPositions.push({
//					matchNum: match.match_number,
//					alliance: 'red',
//					position: idx + 1,
//					teamKey: key
//				});
//			});
//
//			match.alliances.blue.team_keys.forEach((key, idx) => {
//				bluePositions.push({
//					matchNum: match.match_number,
//					alliance: 'blue',
//					position: idx + 1,
//					teamKey: key
//				});
//			});
//
//			const allPositions = [...redPositions, ...bluePositions];
//			
//			// Get scouts available for this specific match based on time
//			const availableScouts = scouts.filter(scout => {
//				// If we have event start time and predicted match time, check actual availability
//				if (eventStartTime && match.predicted_time) {
//					return isScoutAvailableForMatch(scout, match, eventStartTime);
//				}
//				// Fallback: just check if scout has any availability window
//				const windows = getScoutAvailabilityWindows(scout);
//				return windows.length > 0;
//			});
//
//			// Assign scouts to positions in this match using round-robin based on counts
//			allPositions.forEach((pos, posIdx) => {
//				if (availableScouts.length === 0) return;
//
//				// Pick scout with fewest assignments
//				const assignedScout = availableScouts.reduce((least, scout) => {
//					const leastCount = scoutAssignmentCounts.get(least.name) || 0;
//					const scoutCount = scoutAssignmentCounts.get(scout.name) || 0;
//					return scoutCount < leastCount ? scout : least;
//				});
//
//				if (assignedScout) {
//					newAssignments.push({
//						matchNum: pos.matchNum,
//						scout: assignedScout.name,
//						alliance: pos.alliance,
//						position: pos.position,
//						teamNum: pos.teamKey.replace('frc', '')
//					});
//
//					// Update count for this scout
//					scoutAssignmentCounts.set(assignedScout.name, (scoutAssignmentCounts.get(assignedScout.name) || 0) + 1);
//				}
//			});
//		});

		assignments = newAssignments;
		console.log('Generated', assignments.length, 'assignments');
		saveCache();
	}

	function getMatchTime(matchNum) {
		const match = schedule.find(m => m.match_number === matchNum);
		if (!match || !match.predicted_time) return 'TBD';
		
		const matchDate = new Date(match.predicted_time * 1000);
		const hours = String(matchDate.getHours()).padStart(2, '0');
		const minutes = String(matchDate.getMinutes()).padStart(2, '0');
		return `${hours}:${minutes}`;
	}

	function selectScout(scoutName) {
		selectedScout = scoutName;
		scoutMatches = assignments.filter(a => a.scout === scoutName);
	}

	async function loadData(forceRefresh = false) {
		loading = true;
		error = null;

		try {
			// Try to load from cache unless forced refresh
			if (!forceRefresh && loadCache()) {
				console.log('Loaded from cache');
				if (assignments.length === 0) {
					generateAssignments();
				}
				loading = false;
				return;
			}

			// Fetch fresh data
			await fetchEventDetails();
			await fetchEventTeams();
			await fetchSchedule();
			await fetchScouts();

			// Generate assignments
			generateAssignments();
			saveCache();
		} catch (e) {
			console.error('Error loading data:', e);
			error = 'Failed to load data';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadData();
	});
</script>


<svelte:head>
	<title>Scouting Assignments - REBUILT 2026</title>
	<meta name="description" content="Scouting view for 1757 - REBUILT 2026" />
</svelte:head>

<Navbar />

<main class="min-h-screen bg-[#050505] text-white p-4 md:p-8">
	<div class="max-w-7xl mx-auto">
		<div class="flex justify-between items-center mb-8">
			<div>
				<h1 class="text-4xl font-bold mb-2">Scouting Assignments</h1>
				<p class="text-gray-400">
					{#if cacheAge !== null}
						Cache age: {cacheAge} minute{cacheAge !== 1 ? 's' : ''} ago
					{/if}
				</p>
			</div>
			<div class="flex gap-4">
				<button
					on:click={() => loadData(true)}
					class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
				>
					Reload Data
				</button>
			</div>
		</div>

		{#if error}
			<div class="bg-red-900 bg-opacity-20 border border-red-500 rounded-lg p-4 mb-8 text-red-200">
				{error}
			</div>
		{/if}

		{#if loading}
			<div class="flex justify-center items-center h-64">
				<div class="text-center">
					<div class="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500 mb-4 mx-auto"></div>
					<p class="text-gray-400">Loading assignments...</p>
				</div>
			</div>
		{:else}
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
				<!-- Scouts Panel -->
				<div class="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
					<h2 class="text-xl font-bold mb-4">Scouts</h2>
					<div class="space-y-2">
						{#each scouts as scout (scout.name)}
							{@const windows = getScoutAvailabilityWindows(scout)}
							<button
								on:click={() => selectScout(scout.name)}
								class="w-full text-left px-3 py-2 rounded-lg transition {selectedScout === scout.name
									? 'bg-blue-600'
									: 'bg-zinc-800 hover:bg-zinc-700'}"
							>
								<div class="font-semibold">{scout.name}</div>
								<div class="text-xs text-gray-400">
									{#if windows.length === 0}
										<span class="text-red-400">Unavailable</span>
									{:else}
										{windows.length} available day{windows.length > 1 ? 's' : ''}
										<div class="text-xs mt-1">
											{#each windows as window}
												<div>Day {window.day}: {window.startTime} - {window.endTime}</div>
											{/each}
										</div>
									{/if}
								</div>
								<div class="text-sm text-gray-400 mt-1">
									{assignments.filter(a => a.scout === scout.name).length} assignments
								</div>
							</button>
						{/each}
					</div>
				</div>

				<!-- Assignments Panel -->
				<div class="lg:col-span-2">
					{#if selectedScout}
						<div class="bg-zinc-900 rounded-lg p-6 border border-zinc-800 mb-6">
							<h2 class="text-xl font-bold mb-4">{selectedScout}'s Assignments</h2>
							<div class="overflow-x-auto">
								<table class="w-full text-sm">
									<thead class="text-gray-400 border-b border-zinc-700">
										<tr>
											<th class="text-left px-3 py-2">Match</th>
											<th class="text-left px-3 py-2">Time</th>
											<th class="text-left px-3 py-2">Team</th>
											<th class="text-left px-3 py-2">Alliance</th>
											<th class="text-left px-3 py-2">Position</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-zinc-700">
										{#each scoutMatches as assignment (assignment.matchNum + assignment.teamNum)}
											<tr class="hover:bg-zinc-800">
												<td class="px-3 py-2 font-semibold">M{assignment.matchNum}</td>
												<td class="px-3 py-2 text-gray-300">{getMatchTime(assignment.matchNum)}</td>
												<td class="px-3 py-2">{assignment.teamNum}</td>
												<td class="px-3 py-2">
													<span class={`px-2 py-1 rounded font-semibold ${assignment.alliance === 'red' ? 'bg-red-900 bg-opacity-40 text-red-300' : 'bg-blue-900 bg-opacity-40 text-blue-300'}`}>
														{assignment.alliance.toUpperCase()}
													</span>
												</td>
												<td class="px-3 py-2">{assignment.position}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					{:else}
						<div class="bg-zinc-900 rounded-lg p-6 border border-zinc-800 text-center text-gray-400">
							Select a scout to view their assignments
						</div>
					{/if}

					<!-- All Assignments View -->
					<div class="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
						<h2 class="text-xl font-bold mb-4">All Assignments by Match</h2>
						<div class="space-y-4 max-h-96 overflow-y-auto">
							{#each schedule as match (match.match_number)}
								{@const matchAssignments = assignments.filter(a => a.matchNum === match.match_number)}
								<div class="border border-zinc-700 rounded-lg p-3">
									<div class="font-semibold mb-2">Match {match.match_number} @ {getMatchTime(match.match_number)}</div>
									<div class="grid grid-cols-2 gap-2 text-xs">
										<div>
											<div class="text-red-400 font-semibold mb-1">Red Alliance</div>
											{#each matchAssignments.filter(a => a.alliance === 'red') as assign}
												<div class="text-gray-300">
													Pos {assign.position}: <span class="font-semibold">{assign.teamNum}</span> - <span class="text-blue-400">{assign.scout}</span>
												</div>
											{/each}
										</div>
										<div>
											<div class="text-blue-400 font-semibold mb-1">Blue Alliance</div>
											{#each matchAssignments.filter(a => a.alliance === 'blue') as assign}
												<div class="text-gray-300">
													Pos {assign.position}: <span class="font-semibold">{assign.teamNum}</span> - <span class="text-blue-400">{assign.scout}</span>
												</div>
											{/each}
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>

			<!-- Summary Stats -->
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
				<div class="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
					<div class="text-2xl font-bold text-blue-400">{scouts.length}</div>
					<div class="text-sm text-gray-400">Total Scouts</div>
				</div>
				<div class="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
					<div class="text-2xl font-bold text-green-400">{schedule.length}</div>
					<div class="text-sm text-gray-400">Total Matches</div>
				</div>
				<div class="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
					<div class="text-2xl font-bold text-purple-400">{assignments.length}</div>
					<div class="text-sm text-gray-400">Total Assignments</div>
				</div>
				<div class="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
					<div class="text-2xl font-bold text-orange-400">{eventTeams.length}</div>
					<div class="text-sm text-gray-400">Event Teams</div>
				</div>
			</div>
		{/if}
	</div>
</main>

<Footer />

<style>
	:global(body) {
		background-color: #050505;
		font-family: 'Inter', system-ui, -apple-system, sans-serif;
	}
	::-webkit-scrollbar {
		width: 8px;
	}
	::-webkit-scrollbar-track {
		background: #050505;
	}
	::-webkit-scrollbar-thumb {
		background: #18181b;
		border-radius: 10px;
	}
	::-webkit-scrollbar-thumb:hover {
		background: #27272a;
	}
</style>
