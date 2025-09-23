-- Compiled with roblox-ts v3.0.0
local TS = require(game:GetService("ReplicatedStorage"):WaitForChild("rbxts_include"):WaitForChild("RuntimeLib"))

local World = TS.import(script, game:GetService("ReplicatedStorage"), "rbxts_include", "node_modules", "@rbxts", "matter", "lib").World



function World.constructor(obj)
	local firstStorage = {}

	-- 复制 world 的new 部分代码, 作为构造函数.
    for k,v in pairs({
		-- List of maps from archetype string --> entity ID --> entity data
		_storages = { firstStorage },
		-- The most recent storage that has not been dirtied by an iterator
		_pristineStorage = firstStorage,

		-- Map from entity ID -> archetype string
		_entityArchetypes = {},

		-- Cache of the component metatables on each entity. Used for generating archetype.
		-- Map of entity ID -> array
		_entityMetatablesCache = {},

		-- Cache of what query archetypes are compatible with what component archetypes
		_queryCache = {},

		-- Cache of what entity archetypes have ever existed in the game. This is used for knowing
		-- when to update the queryCache.
		_entityArchetypeCache = {},

		-- The next ID that will be assigned with World:spawn
		_nextId = 1,

		-- The total number of active entities in the world
		_size = 0,

		-- Storage for `queryChanged`
		_changedStorage = {},
	} ) do
        obj[k] = v
    end

	return obj
end


return {
	World=World
}