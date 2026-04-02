<script>
	import Navbar from '../../components/navbar.svelte';
	import Footer from '../../components/footer.svelte';
	import { onMount } from 'svelte';
	import { jsPDF } from 'jspdf';
	import html2canvas from 'html2canvas';

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
	let isFullscreen = false;
	let pdfElement = null;
	let scoutPdfElement = null;

	$: unassignedMatches = schedule.filter(match => {
		const assignedCount = assignments.filter(a => a.matchNum === match.match_number).length;
		return assignedCount < 6;
	}).map(m => m.match_number);

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

	function getMinBreakTimeBetweenBatches(scoutName, assignedBatches) {
		if (assignedBatches.length <= 1) return Infinity;
		
		// Sort batches by their first match number
		const sorted = [...assignedBatches].sort((a, b) => a[0].match_number - b[0].match_number);
		
		let minBreak = Infinity;
		for (let i = 1; i < sorted.length; i++) {
			const prevBatch = sorted[i - 1];
			const currBatch = sorted[i];
			const breakMatches = currBatch[0].match_number - prevBatch[prevBatch.length - 1].match_number - 1;
			minBreak = Math.min(minBreak, breakMatches);
		}
		
		return minBreak;
	}

	function generateAssignments() {
		if (scouts.length === 0 || schedule.length === 0) {
			error = 'Need both scouts and schedule to generate assignments';
			return;
		}

		const newAssignments = [];
		// Track which batches each scout is assigned to
		const scoutBatchAssignments = new Map();
		scouts.forEach(scout => {
			scoutBatchAssignments.set(scout.name, []);
		});

    const batchSize = 5; // Process matches in batches to give scouts longer breaks
    const batches = [];
    for (let i = 0; i < schedule.length; i += batchSize) {
      batches.push(schedule.slice(i, i + batchSize));
    }
    console.log(batches)
    batches.forEach((batch, batchIdx) => {

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

      // Track scouts already assigned to this batch
      const scoutsAssignedToBatch = new Set();

      // Assign scouts to positions in this batch, prioritizing break time
      allPositions.forEach((pos, posIdx) => {
        if (availableScouts.length === 0) return;

        // Filter out scouts already assigned to this batch
        const remainingScouts = availableScouts.filter(scout => !scoutsAssignedToBatch.has(scout.name));
        if (remainingScouts.length === 0) return;

        // Pick scout with the best break time (largest minimum gap between assignments)
        const assignedScout = remainingScouts.reduce((best, scout) => {
          const bestMinBreak = getMinBreakTimeBetweenBatches(best.name, scoutBatchAssignments.get(best.name));
          const scoutMinBreak = getMinBreakTimeBetweenBatches(scout.name, scoutBatchAssignments.get(scout.name));
          
          // Prioritize scouts with larger minimum breaks
          if (scoutMinBreak !== bestMinBreak) {
            return scoutMinBreak > bestMinBreak ? scout : best;
          }
          
          // If breaks are equal, prioritize scouts with fewer total assignments
          const bestCount = scoutBatchAssignments.get(best.name).length;
          const scoutCount = scoutBatchAssignments.get(scout.name).length;
          return scoutCount < bestCount ? scout : best;
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

          // Mark scout as assigned to this batch
          scoutsAssignedToBatch.add(assignedScout.name);
        }
      });

      // Add batches to scout assignments (only once per scout per batch)
      scoutsAssignedToBatch.forEach(scoutName => {
        scoutBatchAssignments.get(scoutName).push(batch);
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

	function formatTime(timestamp) {
		if (!timestamp) return null;
		const date = new Date(timestamp * 1000);
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		return `${hours}:${minutes}`;
	}

	function getMatchTimes(matchNum) {
		const match = schedule.find(m => m.match_number === matchNum);
		if (!match) return { predicted: 'TBD', scheduled: null, actual: null };
		
		return {
			scheduled: formatTime(match.scheduled_time),
			predicted: formatTime(match.predicted_time),
			actual: formatTime(match.actual_time)
		};
	}

	function getMatchTime(matchNum) {
		const match = schedule.find(m => m.match_number === matchNum);
		if (!match || !match.predicted_time) return 'TBD';
		
		const matchDate = new Date(match.predicted_time * 1000);
		const hours = String(matchDate.getHours()).padStart(2, '0');
		const minutes = String(matchDate.getMinutes()).padStart(2, '0');
		return `${hours}:${minutes}`;
	}

	function getMatchDate(matchNum) {
		const match = schedule.find(m => m.match_number === matchNum);
		if (!match || !match.predicted_time) return null;
		const date = new Date(match.predicted_time * 1000);
		return date.toDateString();
	}

	function getScoutAssignmentTimeline(scoutName) {
		// Get all unique match numbers this scout is assigned to, sorted
		const scoutAssignments = assignments.filter(a => a.scout === scoutName);
		const uniqueMatches = [...new Set(scoutAssignments.map(a => a.matchNum))].sort((a, b) => a - b);
		
		if (uniqueMatches.length === 0) return [];
		
		const timeline = [];
		
		// Add each match
		for (let i = 0; i < uniqueMatches.length; i++) {
			timeline.push({
				type: 'match',
				matchNum: uniqueMatches[i],
				assignments: scoutAssignments.filter(a => a.matchNum === uniqueMatches[i])
			});
			
			// Check if next match is on a different day
			if (i < uniqueMatches.length - 1) {
				const currMatch = uniqueMatches[i];
				const nextMatch = uniqueMatches[i + 1];
				const currDate = getMatchDate(currMatch);
				const nextDate = getMatchDate(nextMatch);
				
				// If dates differ, add end-of-day indicator
				if (currDate && nextDate && currDate !== nextDate) {
					timeline.push({
						type: 'end-of-day',
						afterMatch: currMatch,
						beforeMatch: nextMatch,
						endDate: currDate,
						startDate: nextDate
					});
				} else {
					// Add regular break if there's a gap
					const breakSize = nextMatch - currMatch - 1;
					if (breakSize > 0) {
						timeline.push({
							type: 'break',
							breakSize: breakSize,
							breakMatches: Array.from({length: breakSize}, (_, idx) => currMatch + idx + 1),
							afterMatch: currMatch,
							beforeMatch: nextMatch
						});
					}
				}
			}
		}
		
		return timeline;
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

	function exportToPDF() {
		if (!pdfElement) return;
		
		// Create a hidden container for PDF content
		const pdfContainer = document.createElement('div');
		pdfContainer.style.position = 'absolute';
		pdfContainer.style.left = '-9999px';
		pdfContainer.style.top = '-9999px';
		pdfContainer.style.width = '190mm';
		pdfContainer.style.padding = '10mm';
		pdfContainer.style.backgroundColor = 'white';
		pdfContainer.style.fontFamily = 'Courier New, monospace';
		pdfContainer.style.color = '#000';
		pdfContainer.style.fontSize = '10px';
		pdfContainer.style.lineHeight = '1.2';
		
		// Add title and metadata
		let html = `
			<div style="text-align: center; margin-bottom: 12px; border-bottom: 1px solid #000; padding-bottom: 8px;">
				<h1 style="margin: 0; font-size: 18px; font-weight: bold;">SCOUTING ASSIGNMENTS</h1>
				<p style="margin: 3px 0 0 0; font-size: 9px;">Generated: ${new Date().toLocaleString()}</p>
			</div>
		`;
		
		// Summary stats
		html += `
			<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 12px; font-size: 10px;">
				<div style="border: 1px solid #000; padding: 4px; text-align: center;">
					<div style="font-weight: bold;">${scouts.length}</div>
					<div style="font-size: 8px;">Scouts</div>
				</div>
				<div style="border: 1px solid #000; padding: 4px; text-align: center;">
					<div style="font-weight: bold;">${schedule.length}</div>
					<div style="font-size: 8px;">Matches</div>
				</div>
				<div style="border: 1px solid #000; padding: 4px; text-align: center;">
					<div style="font-weight: bold;">${assignments.length}</div>
					<div style="font-size: 8px;">Assignments</div>
				</div>
			</div>
		`;
		
		// All assignments by match - using table for better text rendering
		html += `
			<div style="margin-bottom: 20px;">
				<h2 style="font-size: 11px; font-weight: bold; margin: 0 0 8px 0; border-bottom: 1px solid #000;">ASSIGNMENTS BY MATCH</h2>
				<table style="width: 100%; border-collapse: collapse; font-size: 9px;">
					<tr style="background: #f0f0f0;">
						<th style="border: 1px solid #000; padding: 3px; text-align: left;">Match</th>
						<th style="border: 1px solid #000; padding: 3px; text-align: left;">Time</th>
						<th style="border: 1px solid #000; padding: 3px; text-align: left;">RED Alliance</th>
						<th style="border: 1px solid #000; padding: 3px; text-align: left;">BLUE Alliance</th>
					</tr>
					${schedule.map((match, idx) => {
						const matchAssignments = assignments.filter(a => a.matchNum === match.match_number);
						const times = getMatchTimes(match.match_number);
						const redAssigns = matchAssignments.filter(a => a.alliance === 'red').sort((a, b) => a.position - b.position);
						const blueAssigns = matchAssignments.filter(a => a.alliance === 'blue').sort((a, b) => a.position - b.position);
						
						// Check if next match is on different day
						const nextMatch = idx < schedule.length - 1 ? schedule[idx + 1] : null;
						const currentDate = getMatchDate(match.match_number);
						const nextDate = nextMatch ? getMatchDate(nextMatch.match_number) : null;
						const isDayEnd = currentDate && nextDate && currentDate !== nextDate;
						
						// Format positions with team number and scout name
						const formatPosition = (assign) => `
							<div style="display: inline-block; margin-right: 4px; text-align: center; font-size: 7px; line-height: 1.1;">
								<div style="font-weight: bold;">${assign.teamNum}</div>
								<div style="font-size: 6px;">${assign.scout}</div>
							</div>
						`;
						
						let rowHtml = `
							<tr>
								<td style="border: 1px solid #ccc; padding: 3px; font-weight: bold;">M${match.match_number}</td>
								<td style="border: 1px solid #ccc; padding: 3px; font-size: 8px;">${times.predicted || 'TBD'}</td>
								<td style="border: 1px solid #ccc; padding: 3px; min-height: 35px; vertical-align: middle;">
									${redAssigns.map(a => formatPosition(a)).join('')}
								</td>
								<td style="border: 1px solid #ccc; padding: 3px; min-height: 35px; vertical-align: middle;">
									${blueAssigns.map(a => formatPosition(a)).join('')}
								</td>
							</tr>
						`;
						
						// Add end-of-day marker
						if (isDayEnd) {
							rowHtml += `
								<tr style="background: #ffe6e6;">
									<td colspan="4" style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; font-size: 8px;">
										END OF DAY - ${currentDate}
									</td>
								</tr>
							`;
						}
						
						return rowHtml;
					}).join('')}
				</table>
			</div>
		`;
		
		// Scout assignments summary
		html += `
			<div style="margin-top: 20px;">
				<h2 style="font-size: 11px; font-weight: bold; margin: 0 0 8px 0; border-bottom: 1px solid #000;">SCOUT ASSIGNMENTS</h2>
				<table style="width: 100%; border-collapse: collapse; font-size: 9px;">
					<tr style="background: #f0f0f0;">
						<th style="border: 1px solid #000; padding: 3px; text-align: left;">Scout</th>
						<th style="border: 1px solid #000; padding: 3px; text-align: left;">Matches</th>
					</tr>
					${scouts.map(scout => {
						const scoutAssignments = assignments.filter(a => a.scout === scout.name);
						if (scoutAssignments.length === 0) return '';
						
						const matchList = scoutAssignments
							.sort((a, b) => a.matchNum - b.matchNum)
							.map(a => `M${a.matchNum}:${a.teamNum}(${a.alliance[0].toUpperCase()}${a.position})`)
							.join(' ');
						
						return `
							<tr>
								<td style="border: 1px solid #ccc; padding: 3px;">${scout.name}</td>
								<td style="border: 1px solid #ccc; padding: 3px; font-size: 8px;">${matchList}</td>
							</tr>
						`;
					}).join('')}
				</table>
			</div>
		`;
		
		pdfContainer.innerHTML = html;
		document.body.appendChild(pdfContainer);
		
		// Use html2canvas with lower scale for cleaner output
		html2canvas(pdfContainer, {
			scale: 1.5,
			allowTaint: true,
			useCORS: true,
			backgroundColor: '#ffffff',
			logging: false,
			windowHeight: pdfContainer.scrollHeight
		}).then(canvas => {
			const pdf = new jsPDF({
				orientation: 'portrait',
				unit: 'mm',
				format: 'a4'
			});
			
			const pageWidth = pdf.internal.pageSize.getWidth();
			const pageHeight = pdf.internal.pageSize.getHeight();
			const margin = 10;
			const contentWidth = pageWidth - (2 * margin);
			const contentHeight = pageHeight - (2 * margin);
			
			// Calculate how tall the image will be when scaled to fit page width
			const imgWidth = contentWidth;
			const scale = imgWidth / canvas.width;
			const totalHeight = canvas.height * scale;
			
			const imgData = canvas.toDataURL('image/png');
			let currentPage = 0;
			let remainingHeight = totalHeight;
			let sourceY = 0;
			
			while (remainingHeight > 0) {
				if (currentPage > 0) {
					pdf.addPage();
				}
				
				// Calculate how much of the source to use for this page
				const heightForThisPage = Math.min(remainingHeight, contentHeight);
				const sourceHeightRatio = heightForThisPage / totalHeight;
				const sourceHeightPixels = canvas.height * sourceHeightRatio;
				
				// Create a temporary canvas to crop the image
				const tempCanvas = document.createElement('canvas');
				tempCanvas.width = canvas.width;
				tempCanvas.height = sourceHeightPixels;
				const tempCtx = tempCanvas.getContext('2d');
				tempCtx.drawImage(
					canvas,
					0, sourceY * canvas.height / totalHeight,
					canvas.width, sourceHeightPixels,
					0, 0,
					canvas.width, sourceHeightPixels
				);
				
				const croppedData = tempCanvas.toDataURL('image/png');
				pdf.addImage(croppedData, 'PNG', margin, margin, imgWidth, heightForThisPage);
				
				sourceY += heightForThisPage;
				remainingHeight -= heightForThisPage;
				currentPage++;
			}
			
			const filename = `scouting-assignments-${new Date().toISOString().split('T')[0]}.pdf`;
			pdf.save(filename);
			
			// Clean up
			document.body.removeChild(pdfContainer);
		}).catch(err => {
			console.error('PDF export error:', err);
			error = 'Failed to export PDF';
			if (document.body.contains(pdfContainer)) {
				document.body.removeChild(pdfContainer);
			}
		});
	}

	function exportScoutToPDF() {
		if (!selectedScout || !scoutPdfElement) {
			error = 'Please select a scout first';
			return;
		}
		
		// Create a new light-themed container for the scout PDF
		const pdfContainer = document.createElement('div');
		pdfContainer.style.position = 'absolute';
		pdfContainer.style.left = '-9999px';
		pdfContainer.style.top = '-9999px';
		pdfContainer.style.width = '190mm';
		pdfContainer.style.padding = '10mm';
		pdfContainer.style.backgroundColor = 'white';
		pdfContainer.style.fontFamily = 'Courier New, monospace';
		pdfContainer.style.color = '#000';
		pdfContainer.style.fontSize = '10px';
		pdfContainer.style.lineHeight = '1.2';
		
		// Get all scout assignments
		const scoutAssignments = assignments.filter(a => a.scout === selectedScout);
		const uniqueMatches = [...new Set(scoutAssignments.map(a => a.matchNum))].sort((a, b) => a - b);
		
		// Add title
		let html = `
			<div style="text-align: center; margin-bottom: 12px; border-bottom: 1px solid #000; padding-bottom: 8px;">
				<h1 style="margin: 0; font-size: 18px; font-weight: bold;">SCOUT ASSIGNMENT</h1>
				<p style="margin: 3px 0 0 0; font-size: 10px;">${selectedScout}</p>
				<p style="margin: 3px 0 0 0; font-size: 9px;">Generated: ${new Date().toLocaleString()}</p>
			</div>
		`;
		
		// Summary
		html += `
			<div style="margin-bottom: 12px; font-size: 10px;">
				<div style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">
					${uniqueMatches.length} Matches
				</div>
			</div>
		`;
		
		// Scout timeline - using table format with breaks and end-of-day
		html += `
			<div style="margin-bottom: 20px;">
				<h2 style="font-size: 11px; font-weight: bold; margin: 0 0 8px 0; border-bottom: 1px solid #000;">ASSIGNMENTS</h2>
				<table style="width: 100%; border-collapse: collapse; font-size: 9px;">
					<tr style="background: #f0f0f0;">
						<th style="border: 1px solid #000; padding: 3px; text-align: left;">Match</th>
						<th style="border: 1px solid #000; padding: 3px; text-align: left;">Time</th>
						<th style="border: 1px solid #000; padding: 3px; text-align: left;">Team</th>
						<th style="border: 1px solid #000; padding: 3px; text-align: left;">Alliance</th>
						<th style="border: 1px solid #000; padding: 3px; text-align: left;">Position</th>
					</tr>
					${uniqueMatches.map((matchNum, idx) => {
						const matchAssigns = scoutAssignments.filter(a => a.matchNum === matchNum);
						const times = getMatchTimes(matchNum);
						
						// Check if next match is on different day
						const nextMatchNum = idx < uniqueMatches.length - 1 ? uniqueMatches[idx + 1] : null;
						const currentDate = getMatchDate(matchNum);
						const nextDate = nextMatchNum ? getMatchDate(nextMatchNum) : null;
						const isDayEnd = currentDate && nextDate && currentDate !== nextDate;
						
						// Check if there's a break before next match
						const breakSize = nextMatchNum ? nextMatchNum - matchNum - 1 : 0;
						const hasBreak = breakSize > 0;
						
						let rowHtml = matchAssigns.map((assign, assignIdx) => `
							<tr>
								${assignIdx === 0 ? `<td style="border: 1px solid #ccc; padding: 3px; font-weight: bold;">M${matchNum}</td>` : '<td style="border: 1px solid #ccc; padding: 3px;"></td>'}
								${assignIdx === 0 ? `<td style="border: 1px solid #ccc; padding: 3px; font-size: 8px;">${times.predicted || 'TBD'}</td>` : '<td style="border: 1px solid #ccc; padding: 3px;"></td>'}
								<td style="border: 1px solid #ccc; padding: 3px; font-weight: bold;">${assign.teamNum}</td>
								<td style="border: 1px solid #ccc; padding: 3px; font-size: 8px;">${assign.alliance.toUpperCase()}</td>
								<td style="border: 1px solid #ccc; padding: 3px; text-align: center;">${assign.position}</td>
							</tr>
						`).join('');
						
						// Add break indicator if there's a gap
						if (hasBreak && !isDayEnd) {
							rowHtml += `
								<tr style="background: #fff3cd;">
									<td colspan="5" style="border: 1px solid #000; padding: 3px; text-align: center; font-size: 8px; font-weight: bold;">
										BREAK: ${breakSize} match${breakSize > 1 ? 'es' : ''} (M${matchNum + 1}-M${nextMatchNum - 1})
									</td>
								</tr>
							`;
						}
						
						// Add end-of-day marker
						if (isDayEnd) {
							rowHtml += `
								<tr style="background: #ffe6e6;">
									<td colspan="5" style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; font-size: 8px;">
										END OF DAY - ${currentDate}
									</td>
								</tr>
							`;
						}
						
						return rowHtml;
					}).join('')}
				</table>
			</div>
		`;
		
		pdfContainer.innerHTML = html;
		document.body.appendChild(pdfContainer);
		
		// Use html2canvas with proper scale
		html2canvas(pdfContainer, {
			scale: 1.5,
			allowTaint: true,
			useCORS: true,
			backgroundColor: '#ffffff',
			logging: false,
			windowHeight: pdfContainer.scrollHeight
		}).then(canvas => {
			const pdf = new jsPDF({
				orientation: 'portrait',
				unit: 'mm',
				format: 'letter'
			});
			
			const pageWidth = pdf.internal.pageSize.getWidth();
			const pageHeight = pdf.internal.pageSize.getHeight();
			const margin = 10;
			const contentWidth = pageWidth - (2 * margin);
			const contentHeight = pageHeight - (2 * margin);
			
			// Calculate how tall the image will be when scaled to fit page width
			const imgWidth = contentWidth;
			const scale = imgWidth / canvas.width;
			const totalHeight = canvas.height * scale;
			
			const imgData = canvas.toDataURL('image/png');
			let currentPage = 0;
			let remainingHeight = totalHeight;
			let sourceY = 0;
			
			while (remainingHeight > 0) {
				if (currentPage > 0) {
					pdf.addPage();
				}
				
				// Calculate how much of the source to use for this page
				const heightForThisPage = Math.min(remainingHeight, contentHeight);
				const sourceHeightRatio = heightForThisPage / totalHeight;
				const sourceHeightPixels = canvas.height * sourceHeightRatio;
				
				// Create a temporary canvas to crop the image
				const tempCanvas = document.createElement('canvas');
				tempCanvas.width = canvas.width;
				tempCanvas.height = sourceHeightPixels;
				const tempCtx = tempCanvas.getContext('2d');
				tempCtx.drawImage(
					canvas,
					0, sourceY * canvas.height / totalHeight,
					canvas.width, sourceHeightPixels,
					0, 0,
					canvas.width, sourceHeightPixels
				);
				
				const croppedData = tempCanvas.toDataURL('image/png');
				pdf.addImage(croppedData, 'PNG', margin, margin, imgWidth, heightForThisPage);
				
				sourceY += heightForThisPage;
				remainingHeight -= heightForThisPage;
				currentPage++;
			}
			
			const filename = `${selectedScout.replace(/\s+/g, '-')}-assignments-${new Date().toISOString().split('T')[0]}.pdf`;
			pdf.save(filename);
			
			// Clean up
			document.body.removeChild(pdfContainer);
		}).catch(err => {
			console.error('PDF export error:', err);
			error = 'Failed to export PDF';
			if (document.body.contains(pdfContainer)) {
				document.body.removeChild(pdfContainer);
			}
		});
	}

	onMount(() => {
		loadData();
		const handleFullscreenChange = () => {
			isFullscreen = !!document.fullscreenElement;
		};
		document.addEventListener('fullscreenchange', handleFullscreenChange);
		return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
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
				<a href="/scouting" class="px-4 py-2 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded-lg font-semibold transition">
					Go back to Scouting!
				</a>
				<a href="/scouting-dashboard" class="px-4 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg font-semibold transition">
					Dashboard
				</a>
				<button
					on:click={() => loadData(true)}
					class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
				>
					Reload Data
				</button>
				<button
					on:click={exportToPDF}
					class="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition"
					title="Export all assignments to PDF"
				>
					📄 Export PDF
				</button>
				<button
					on:click={toggleFullscreen}
					class="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-semibold transition"
					title="Toggle fullscreen"
				>
					{isFullscreen ? '⛌' : '⛶'}
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
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-8" bind:this={pdfElement}>
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
						<div class="bg-zinc-900 rounded-lg p-6 border border-zinc-800 mb-6" bind:this={scoutPdfElement}>
							<div class="flex justify-between items-center mb-4">
								<h2 class="text-xl font-bold">{selectedScout}'s Assignments</h2>
								<button
									on:click={exportScoutToPDF}
									class="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm font-semibold transition"
									title="Export this scout's assignments to PDF"
								>
									📄 PDF
								</button>
							</div>
							<div class="overflow-x-auto">
								<div class="space-y-3">
									{#each getScoutAssignmentTimeline(selectedScout) as item (item.type === 'match' ? `match-${item.matchNum}` : `break-${item.afterMatch}-${item.beforeMatch}`)}
										{#if item.type === 'match'}
											{#each item.assignments as assignment (assignment.matchNum + assignment.teamNum)}
												{@const times = getMatchTimes(assignment.matchNum)}
												<div class="border border-zinc-700 rounded-lg p-3 hover:bg-zinc-800 transition">
													<div class="flex justify-between items-center mb-2">
														<span class="font-semibold">Match {assignment.matchNum}</span>
														<div class="text-xs text-gray-400">
															{#if times.actual}
																<span class="text-green-400">Actual: {times.actual}</span>
                              {/if}
															{#if times.predicted}
																<span class="text-blue-400">Predicted: {times.predicted}</span>
                    {/if}
																{#if times.scheduled && times.scheduled !== times.predicted}
																	<br /><span class="text-gray-500">Scheduled: {times.scheduled}</span>
															{/if}
														</div>
													</div>
													<div class="flex gap-4 text-sm">
														<div class="flex-1">
															<span class="text-gray-400">Team:</span> {assignment.teamNum}
														</div>
														<div class="flex-1">
															<span class={`px-2 py-1 rounded font-semibold text-xs ${assignment.alliance === 'red' ? 'bg-red-900 bg-opacity-40 text-red-300' : 'bg-blue-900 bg-opacity-40 text-blue-300'}`}>
																{assignment.alliance.toUpperCase()} {assignment.position}
															</span>
														</div>
													</div>
												</div>
											{/each}
										{:else if item.type === 'break'}
											<div class="bg-zinc-800 rounded-lg p-3 border-2 border-yellow-600 border-dashed">
												<div class="flex justify-between items-center mb-2">
													<span class="text-sm font-semibold text-yellow-400">
														🕐 Break: {item.breakSize} match{item.breakSize !== 1 ? 'es' : ''}
													</span>
													<span class="text-xs text-gray-400">
														After M{item.afterMatch}, Before M{item.beforeMatch}
													</span>
												</div>
												<div class="text-xs text-gray-400">
													Free for match{item.breakSize !== 1 ? 'es' : ''}: {item.breakMatches.join(', ')}
												</div>
											</div>
										{:else if item.type === 'end-of-day'}
											<div class="flex items-center my-4 gap-3">
												<div class="flex-1 h-0.5 bg-gradient-to-r from-orange-600 via-orange-500 to-transparent"></div>
												<span class="text-sm font-bold text-orange-500 px-3 py-2 bg-zinc-800 rounded-full border border-orange-600 whitespace-nowrap">
													🌅 END OF DAY
												</span>
												<div class="flex-1 h-0.5 bg-gradient-to-l from-orange-600 via-orange-500 to-transparent"></div>
											</div>
										{/if}
									{/each}
								</div>
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
								{@const times = getMatchTimes(match.match_number)}
								<div class="border border-zinc-700 rounded-lg p-3">
									<div class="flex justify-between items-center mb-2">
										<span class="font-semibold">Match {match.match_number}</span>
										<div class="text-xs text-gray-400">
											{#if times.actual}
												<span class="text-green-400">✓ {times.actual}</span>
											{:else if times.predicted}
												<span class="text-blue-400">{times.predicted}</span>
												{#if times.scheduled && times.scheduled !== times.predicted}
													<span class="text-gray-500 ml-1">(sched: {times.scheduled})</span>
												{/if}
											{:else}
												<span>TBD</span>
											{/if}
										</div>
									</div>
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

			{#if unassignedMatches.length > 0}
				<div class="bg-yellow-900 bg-opacity-20 border border-yellow-500 rounded-lg p-4 mt-6 text-yellow-200">
					<div class="font-semibold mb-2">⚠️ Unassigned Matches Detected</div>
					<div class="text-sm">The following matches have incomplete scout assignments:</div>
					<div class="mt-2 font-mono text-xs bg-black bg-opacity-30 p-2 rounded">
						{unassignedMatches.join(', ')}
					</div>
				</div>
			{/if}

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
