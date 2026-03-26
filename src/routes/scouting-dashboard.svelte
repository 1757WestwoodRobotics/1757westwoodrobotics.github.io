<script>
	import Navbar from '../components/navbar.svelte';
	import Footer from '../components/footer.svelte';
	import { onMount } from 'svelte';

	let scoutingData = [];
	let loading = true;
	let error = null;
	let searchTerm = '';

	const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRUxqLukIXm32NQACEavD7l8jzLbR8y5VJK_c5p3mfKkx4D-tlii9SiPpsVgaElgTjUgWyUfym_T4jo/pub?gid=2114301842&single=true&output=csv';

	function parseCSV(text) {
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

		if (rows.length < 2) return [];
		// Use the second row (index 1) as headers, as the first row contains grouping/helpful headers
		const headers = rows[1].map(h => h.trim());
		return rows.slice(2).map(row => {
			const obj = {};
			headers.forEach((header, i) => {
				// Handle empty headers or duplicate headers if they exist
				const key = header || `column_${i}`;
				obj[key] = row[i] ? row[i].trim() : '';
			});
			return obj;
		});
	}

	async function fetchData() {
		try {
			loading = true;
			const res = await fetch(CSV_URL);
			if (!res.ok) throw new Error('Failed to fetch data');
			const text = await res.text();
			scoutingData = parseCSV(text);
		} catch (e) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	onMount(fetchData);

	$: filteredData = scoutingData.filter(row => {
		if (!searchTerm) return true;
		const team = getVal(row, 'Team #');
		if (team && team !== 'N/A') {
			return team.includes(searchTerm);
		}
		return Object.values(row).some(v => v.toLowerCase().includes(searchTerm.toLowerCase()));
	});

	// Helper to find column keys because Google Forms headers can be long
	function getVal(row, partialKey) {
		const keys = Object.keys(row);
		// Try exact match first (case insensitive)
		const exactMatch = keys.find(k => k.toLowerCase() === partialKey.toLowerCase());
		if (exactMatch) return row[exactMatch];
		
		// Try match starting with partialKey
		const startsWith = keys.find(k => k.toLowerCase().startsWith(partialKey.toLowerCase()));
		if (startsWith) return row[startsWith];

		// Try any inclusion
		const key = keys.find(k => k.toLowerCase().includes(partialKey.toLowerCase()));
		return (key && row[key]) ? row[key] : 'N/A';
	}

    let selectedRow = null;
</script>

<svelte:head>
	<title>Scouting Dashboard</title>
</svelte:head>

<Navbar />

<div class="min-h-screen bg-zinc-900 text-white p-4">
	<div class="container mx-auto">
		<div class="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
			<h1 class="text-3xl font-black text-blue-500 uppercase tracking-tighter">Scouting Dashboard</h1>
			
			<div class="relative w-full md:w-64">
				<input 
					type="text" 
					bind:value={searchTerm} 
					placeholder="Search Team #..." 
					class="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 px-4 focus:ring-2 focus:ring-blue-500 outline-none transition"
				/>
			</div>
			
			<button 
				on:click={fetchData} 
				class="bg-zinc-800 hover:bg-zinc-700 p-2 px-4 rounded-lg font-bold text-xs transition border border-zinc-700"
			>
				REFRESH
			</button>
		</div>

		{#if loading}
			<div class="flex justify-center items-center h-64">
				<div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
			</div>
		{:else if error}
			<div class="bg-red-900/20 border border-red-500 text-red-500 p-4 rounded-lg">
				Error: {error}
			</div>
		{:else}
			<div class="overflow-x-auto bg-zinc-800 rounded-xl border border-zinc-700 shadow-2xl">
				<table class="w-full text-left border-collapse">
					<thead>
						<tr class="bg-zinc-700/50 text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
							<th class="p-4 border-b border-zinc-700">Team</th>
							<th class="p-4 border-b border-zinc-700">Match</th>
							<th class="p-4 border-b border-zinc-700">Auto</th>
							<th class="p-4 border-b border-zinc-700">Climb</th>
							<th class="p-4 border-b border-zinc-700">Eff.</th>
							<th class="p-4 border-b border-zinc-700">Scouter</th>
							<th class="p-4 border-b border-zinc-700">Action</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-zinc-700">
						{#each filteredData as row}
							<tr class="hover:bg-zinc-700/30 transition-colors cursor-pointer" on:click={() => selectedRow = row}>
								<td class="p-4 font-black text-blue-400">{getVal(row, 'Team #')}</td>
								<td class="p-4 font-mono text-xs">{getVal(row, 'Match #')}</td>
								<td class="p-4 text-xs">
									<span class="px-2 py-1 rounded bg-zinc-900 border border-zinc-700">
										{getVal(row, 'Starting position?')}
									</span>
								</td>
								<td class="p-4">
									<span class="px-2 py-1 rounded text-[10px] font-bold uppercase {getVal(row, 'climb level').includes('No') ? 'text-zinc-500' : 'bg-purple-900/30 text-purple-400'}">
										{getVal(row, 'climb level')}
									</span>
								</td>
								<td class="p-4">
									<div class="flex items-center gap-1">
										<div class="h-1.5 w-12 bg-zinc-900 rounded-full overflow-hidden">
											<div class="h-full bg-blue-500" style="width: {parseInt(getVal(row, 'Scoring effectiveness?')) * 20}%"></div>
										</div>
										<span class="text-[10px] font-bold">{getVal(row, 'Scoring effectiveness?')}</span>
									</div>
								</td>
								<td class="p-4 text-xs text-zinc-500">{getVal(row, 'Scouter initials')}</td>
								<td class="p-4">
									<button class="text-xs font-bold text-zinc-400 hover:text-white transition">VIEW</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			{#if filteredData.length === 0}
				<div class="text-center p-12 text-zinc-500">
					No scouting data found matching your search.
				</div>
			{/if}
		{/if}
	</div>
</div>

{#if selectedRow}
	<div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" on:click|self={() => selectedRow = null}>
		<div class="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
			<div class="sticky top-0 bg-zinc-900 p-6 border-b border-zinc-700 flex justify-between items-center">
				<div>
					<h2 class="text-2xl font-black text-blue-500 uppercase">Team {getVal(selectedRow, 'Team #')}</h2>
					<p class="text-xs text-zinc-500 uppercase font-bold tracking-widest">Match {getVal(selectedRow, 'Match #')} • Scouter: {getVal(selectedRow, 'Scouter initials')}</p>
				</div>
				<button on:click={() => selectedRow = null} class="p-2 hover:bg-zinc-800 rounded-full transition text-zinc-500 hover:text-white">
					✕
				</button>
			</div>
			
			<div class="p-6 space-y-8">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<section>
						<h3 class="text-xs font-bold text-zinc-500 uppercase mb-3 tracking-widest border-b border-zinc-800 pb-2">Autonomous</h3>
						<div class="space-y-2 text-sm">
							<div class="flex justify-between"><span class="text-zinc-400">Position</span> <span class="font-bold">{getVal(selectedRow, 'Starting position?')}</span></div>
							<div class="flex justify-between"><span class="text-zinc-400">Auto Climb</span> <span class="font-bold">{getVal(selectedRow, 'Auto climb?')}</span></div>
						</div>
					</section>
					
					<section>
						<h3 class="text-xs font-bold text-zinc-500 uppercase mb-3 tracking-widest border-b border-zinc-800 pb-2">Endgame</h3>
						<div class="space-y-2 text-sm">
							<div class="flex justify-between"><span class="text-zinc-400">Climb Level</span> <span class="font-bold text-purple-400">{getVal(selectedRow, 'climb level')}</span></div>
							<div class="flex justify-between"><span class="text-zinc-400">Climb Pos</span> <span class="font-bold">{getVal(selectedRow, 'end climb pos')}</span></div>
						</div>
					</section>
				</div>

				<section>
					<h3 class="text-xs font-bold text-zinc-500 uppercase mb-3 tracking-widest border-b border-zinc-800 pb-2">Performance Metrics</h3>
					<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<div class="bg-zinc-800 p-3 rounded-lg border border-zinc-700">
							<p class="text-[10px] text-zinc-500 uppercase font-bold mb-1">Scoring</p>
							<p class="text-xl font-black text-blue-400">{getVal(selectedRow, 'Scoring effectiveness?')}/5</p>
						</div>
						<div class="bg-zinc-800 p-3 rounded-lg border border-zinc-700">
							<p class="text-[10px] text-zinc-500 uppercase font-bold mb-1">Feeding</p>
							<p class="text-xl font-black text-orange-400">{getVal(selectedRow, 'feeding score?')}/5</p>
						</div>
						<div class="bg-zinc-800 p-3 rounded-lg border border-zinc-700">
							<p class="text-[10px] text-zinc-500 uppercase font-bold mb-1">Defense</p>
							<p class="text-xl font-black text-red-400">{getVal(selectedRow, 'defense skill')}/5</p>
						</div>
					</div>
				</section>

				<section>
					<h3 class="text-xs font-bold text-zinc-500 uppercase mb-3 tracking-widest border-b border-zinc-800 pb-2">Status & Issues</h3>
					<div class="flex flex-wrap gap-2">
						{#if getVal(selectedRow, 'Died?') === 'true'}
							<span class="px-3 py-1 bg-red-900/40 text-red-400 border border-red-800 rounded-full text-xs font-bold uppercase">Died</span>
						{/if}
						{#if getVal(selectedRow, 'Tipped?') === 'true'}
							<span class="px-3 py-1 bg-orange-900/40 text-orange-400 border border-orange-800 rounded-full text-xs font-bold uppercase">Tipped</span>
						{/if}
						{#if getVal(selectedRow, 'Mech issue?') === 'true'}
							<span class="px-3 py-1 bg-yellow-900/40 text-yellow-400 border border-yellow-800 rounded-full text-xs font-bold uppercase">Mech Issue</span>
						{/if}
						{#if getVal(selectedRow, 'card') !== 'No Card'}
							<span class="px-3 py-1 bg-zinc-800 text-white border border-zinc-700 rounded-full text-xs font-bold uppercase">{getVal(selectedRow, 'card')}</span>
						{/if}
					</div>
				</section>

				<section>
					<h3 class="text-xs font-bold text-zinc-500 uppercase mb-3 tracking-widest border-b border-zinc-800 pb-2">Comments</h3>
					<div class="bg-zinc-800 p-4 rounded-xl border border-zinc-700 italic text-zinc-300 text-sm leading-relaxed">
						"{getVal(selectedRow, 'comments') || 'No comments provided.'}"
					</div>
				</section>

                <section>
					<h3 class="text-xs font-bold text-zinc-500 uppercase mb-3 tracking-widest border-b border-zinc-800 pb-2">Raw Data Keys (Debug)</h3>
					<div class="bg-zinc-950 p-3 rounded-lg font-mono text-[8px] text-zinc-600 grid grid-cols-2 gap-2">
						{#each Object.keys(selectedRow).slice(0, 30) as key}
							<div class="truncate">{key}</div>
						{/each}
					</div>
				</section>
			</div>
		</div>
	</div>
{/if}

<Footer />

<style>
	:global(body) {
		background-color: #131313;
	}
</style>
