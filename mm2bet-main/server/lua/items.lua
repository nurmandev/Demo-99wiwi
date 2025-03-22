-- Item Data Fetcher
-- Made by: [REDACTED]
-- Version: 2.0.0


local overwriteMode = false -- if true, rewrites the old file, if false, updates the old one
local imageUpdateMode = false -- if true, updates only images
local propertiesUpdateMode = false -- if true, updates only properties
local fetchDelay = 0.2 -- the delay between fetches (lower number = higher error risk! keep on 0.2)
local maxGetImageAttempts = 3 -- max number of attempts to get an image
local getImageAttemptDelay = 5 -- the delay between attempts to get an image


if not game:IsLoaded() then
    game.Loaded:Wait()
end


-- if not syn then
--     return error("unsupported executor")
-- end

local gameCodes = {
    [66654135] = {"MurderMystery2", "MM2"},
    [383310974] = {"AdoptMe", "AM"}
}
local codePack = gameCodes[game.GameId]
local fullGameCode = codePack and codePack[1]
local gameCode = codePack and codePack[2]
if not codePack then
    return error("unsupported game")
end


local repStorage = game:GetService("ReplicatedStorage")
local httpService = game:GetService("HttpService")

local renv = getrenv()

local rawData = {}
if gameCode == "MM2" then
    for itemName, item in pairs(renv._G.Database.Weapons) do
        local clone = table.clone(item)
        clone.ItemGroup = "Weapons"
        rawData[itemName] = clone
    end
    for itemName, item in pairs(renv._G.Database.Pets) do
        local clone = table.clone(item)
        clone.ItemGroup = "Pets"
        rawData[itemName] = clone
    end
elseif gameCode == "AM" then
    local inv = require(repStorage.Fsys).load("InventoryDB")
    for _, items in pairs(inv) do
        for itemName, item in pairs(items) do
            rawData[itemName] = table.clone(item)
        end
    end
end

local totalItems = 0
for _ in pairs(rawData) do
    totalItems = totalItems + 1
end

local errored = false
local scanned = 0
local fetchedData = ((overwriteMode or not isfile(gameCode.."ItemsData.json")) and {}) or httpService:JSONDecode(readfile(gameCode.."ItemsData.json"))
local timer = os.clock()


local function RequestThumb(id)
    return http_request({
        Url = ("https://thumbnails.roblox.com/v1/assets?assetIds=%s&returnPolicy=0&size=420x420&format=Png&isCircular=false"):format(id),
        Method = "GET",
        Headers = {["Content-Type"] = "application/json"}
    })
end

local function GetImage(assetID)
    local id = nil
    local image = nil

    id = tonumber(string.match(tostring(assetID), "https?://www%.roblox%.com/Thumbs/Asset%.ashx%?.*assetId=(%d+)")) or id
    id = tonumber(string.match(tostring(assetID), "rbxassetid://(%d+)")) or id
    id = tonumber(string.match(tostring(assetID), "^%d+")) or id
    
    if id then
        local internal; internal = function(attempt)
            if attempt and attempt >= maxGetImageAttempts then
                image = "ERROR"
                return
            end
            attempt = (attempt or 0) + 1

            local response = RequestThumb(id)
            if response.Success and response.StatusCode == 200 then
                image = httpService:JSONDecode(response.Body).data[1].imageUrl
            else
                task.wait(getImageAttemptDelay)
                internal(attempt)
            end
        end

        internal()
        return image, id
    end
    return nil, id
end

local function GetProperties(itemData)
    local new = {}
    
    if gameCode == "MM2" then
        new.DisplayName = itemData.ItemName or itemData.Name
        new.Rarity = itemData.Rarity
        new.ItemType = itemData.ItemType or itemData.Type
        new.ItemGroup = itemData.ItemGroup
        new.Chroma = itemData.Chroma
        new.Event = itemData.Event
        new.Year = itemData.Year
        new.Season = itemData.Season or itemData.Season1
        new.Christmas = itemData.Christmas
        new.ChristmasPrice = itemData.ChristmasPrice
        new.ChristmasDescription = itemData.ChristmasDescription
        new.Price = itemData.Price
    elseif gameCode == "AM" then

    end

    return new
end

local function GetImageKey()
    if gameCode == "MM2" then
        return "Image"
    end
end


for itemName, itemData in pairs(rawData) do
    scanned = scanned + 1
    print(itemName, ("%s/%s"):format(scanned, totalItems))

    if fetchedData[itemName] and not overwriteMode then
        if imageUpdateMode then
            local image, imageId = GetImage(itemData[GetImageKey()])
            if image == "ERROR" then
                print(("an error has occurred while getting %s's image"):format(itemName))
                errored = true
                image = nil
            end
            
            fetchedData[itemName].Image = image
            fetchedData[itemName].ImageId = imageId

            print(itemName, "updated image")
        end
        if propertiesUpdateMode then
            fetchedData[itemName].Properties = GetProperties(itemData)

            print(itemName, "updated properties")
        end
        if not imageUpdateMode and not propertiesUpdateMode then
            print(itemName, "already exists, skipped")
        end
    else
        local image, imageId = GetImage(itemData[GetImageKey()])
        if image == "ERROR" then
            print(("an error has occurred while getting %s's image"):format(itemName))
            errored = true
            image = nil
        end

        local item = {
            Value = 0,
            Image = image,
            ImageId = imageId,
            Properties = GetProperties(itemData)
        }

        fetchedData[itemName] = item
        print(itemName, "data fetched")
        task.wait(fetchDelay)
    end
end


writefile(gameCode.."ItemsData.json", httpService:JSONEncode(fetchedData))
print(("fetched in %s seconds%s"):format(os.clock() - timer, ((errored and " (an error has occurred while fetching)") or "")))