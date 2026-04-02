<script>
	export let contextMenu = null;
	export let matchLabel = '';
	export let redLabel = 'Override Red';
	export let blueLabel = 'Override Blue';
	export let onOverrideRed;
	export let onOverrideBlue;
	export let onClearOverride;
	export let onClose;
</script>

{#if contextMenu && matchLabel}
	<div class="fixed inset-0 z-[150]" on:click={() => onClose()} on:contextmenu|preventDefault={() => onClose()}>
		<div
			class="fixed bg-zinc-900 border-2 border-zinc-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
			style="left: {contextMenu.x}px; top: {contextMenu.y}px;"
			on:click|stopPropagation>
			<div class="min-w-[200px]">
				<p class="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-3 py-2 border-b border-zinc-800">
					{matchLabel}
				</p>
				<button
					on:click={() => { onOverrideRed(); onClose(); }}
					class="w-full text-left px-3 py-2 text-[11px] font-black text-red-400 hover:bg-red-600 hover:text-white transition flex items-center gap-2">
					<span class="w-2.5 h-2.5 rounded-sm bg-red-500"></span>
					<span>{redLabel}</span>
				</button>
				<button
					on:click={() => { onOverrideBlue(); onClose(); }}
					class="w-full text-left px-3 py-2 text-[11px] font-black text-blue-400 hover:bg-blue-600 hover:text-white transition flex items-center gap-2">
					<span class="w-2.5 h-2.5 rounded-sm bg-blue-500"></span>
					<span>{blueLabel}</span>
				</button>
				<button
					on:click={() => { onClearOverride(); onClose(); }}
					class="w-full text-left px-3 py-2 text-[11px] font-black text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition flex items-center gap-2 border-t border-zinc-800">
					<span>✕</span>
					<span>Clear Override</span>
				</button>
			</div>
		</div>
	</div>
{/if}
