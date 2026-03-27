<script>
	export let contextMenu = null;
	export let contextMenuMatch = null;
	export let onLoadSimulator;
	export let onClose;
</script>

{#if contextMenu && contextMenuMatch}
	<div class="fixed inset-0 z-[150]" on:click={() => onClose()} on:contextmenu={(e) => e.preventDefault()}>
		<div
			class="fixed bg-zinc-900 border-2 border-zinc-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
			style="left: {contextMenu.x}px; top: {contextMenu.y}px;"
			on:click|stopPropagation>
			<div class="min-w-[200px]">
				<p class="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-3 py-2 border-b border-zinc-800">
					Match {contextMenuMatch.match_number}
				</p>
				<button
					on:click={() => onLoadSimulator(contextMenuMatch)}
					class="w-full text-left px-3 py-2 text-[11px] font-black text-white hover:bg-blue-600 hover:text-white transition flex items-center gap-2">
					<span>🎮</span>
					<span>Load in Simulator</span>
				</button>
				<button
					on:click={() => onClose()}
					class="w-full text-left px-3 py-2 text-[11px] font-black text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition flex items-center gap-2">
					<span>✕</span>
					<span>Close</span>
				</button>
			</div>
		</div>
	</div>
{/if}
