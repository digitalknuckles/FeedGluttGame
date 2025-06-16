import pygame
import random
import os
import webbrowser

# Initialize Pygame
pygame.init()

# Constants
SCREEN_WIDTH, SCREEN_HEIGHT = 800, 600
FPS = 60
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
PLAYER_WIDTH, PLAYER_HEIGHT = 200, 200
GRAVITY_RADIUS = 500
SPECIAL_ITEM_DURATION = 15000
NORMAL_OBJECT_SIZE = (64, 64)
ASSET_PATH = "assets"
WINNING_SCORE = 500
LOSING_HUNGER_THRESHOLD = 0

# Initialize screen
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Feed GLUTT!")

# Load and resize assets
def load_assets():
    assets = {
        "game_background": pygame.image.load(os.path.join(ASSET_PATH, "backgrounds", "default_bg.png")),
        "start_menu_background": pygame.image.load(os.path.join(ASSET_PATH, "backgrounds", "start_menu_bg.png")),
        "player": pygame.image.load(os.path.join(ASSET_PATH, "player", "default_player.png")),
        "objects": {
            "default_object": pygame.image.load(os.path.join(ASSET_PATH, "objects", "default_object.png")),
            "default_object2": pygame.image.load(os.path.join(ASSET_PATH, "objects", "default_object2.png")),
            "default_object3": pygame.image.load(os.path.join(ASSET_PATH, "objects", "default_object3.png")),
            "default_object4": pygame.image.load(os.path.join(ASSET_PATH, "objects", "default_object4.png")),
            "default_object5": pygame.image.load(os.path.join(ASSET_PATH, "objects", "default_object5.png")),
            "default_object6": pygame.image.load(os.path.join(ASSET_PATH, "objects", "default_object6.png")),
            "default_object7": pygame.image.load(os.path.join(ASSET_PATH, "objects", "default_object7.png")),
        },
        "special_sprite_1": pygame.image.load(os.path.join(ASSET_PATH, "objects", "special_sprite_1.png")),
        "special_sprite_2": pygame.image.load(os.path.join(ASSET_PATH, "objects", "special_sprite_2.png")),
        "victory_images": [
            pygame.image.load(os.path.join(ASSET_PATH, "Feed_Glutt", img)) for img in os.listdir(os.path.join(ASSET_PATH, "Feed_Glutt"))
        ],
    }

    assets["game_background"] = pygame.transform.scale(assets["game_background"], (SCREEN_WIDTH, SCREEN_HEIGHT))
    assets["start_menu_background"] = pygame.transform.scale(assets["start_menu_background"], (SCREEN_WIDTH, SCREEN_HEIGHT))
    assets["player"] = pygame.transform.scale(assets["player"], (PLAYER_WIDTH, PLAYER_HEIGHT))
    for key in assets["objects"]:
        assets["objects"][key] = pygame.transform.scale(assets["objects"][key], NORMAL_OBJECT_SIZE)
    assets["special_sprite_1"] = pygame.transform.scale(assets["special_sprite_1"], NORMAL_OBJECT_SIZE)
    assets["special_sprite_2"] = pygame.transform.scale(assets["special_sprite_2"], NORMAL_OBJECT_SIZE)
    for i in range(len(assets["victory_images"])):
        assets["victory_images"][i] = pygame.transform.scale(assets["victory_images"][i], (400, 400))

    return assets

assets = load_assets()

# Falling object definitions with point values
falling_objects = [
    {"sprite": "default_object", "value": 1},
    {"sprite": "default_object2", "value": 10},
    {"sprite": "default_object3", "value": 15},
    {"sprite": "default_object4", "value": 5},
    {"sprite": "default_object5", "value": 5},
    {"sprite": "default_object6", "value": 5},
    {"sprite": "default_object7", "value": -5},  # hunger penalty
]

# Player setup
player_rect = pygame.Rect((SCREEN_WIDTH // 2, SCREEN_HEIGHT - 150), (PLAYER_WIDTH, PLAYER_HEIGHT))
player_speed = 15
score = 0
hunger_bar = 10
dragging = False

# Falling objects
objects = []
object_spawn_timer = 0
OBJECT_SPAWN_INTERVAL = 333  # Time between each object spawn

# Game states
game_started = False
game_won = False
game_lost = False
victory_scene = False
victory_image = None
mouse_clicked = False

# Button properties
button_font = pygame.font.SysFont(None, 36)
button_rect = pygame.Rect(SCREEN_WIDTH // 2 - 100, 550, 220, 50)  # Button size and position
button_color = (0, 255, 0)
button_hover_color = (255, 0, 0)

# Define start menu
def show_start_menu():
    screen.fill(BLACK)
    screen.blit(assets["start_menu_background"], (0, 0))
    font = pygame.font.SysFont(None, 72)
    draw_text("Feed GLUTT!", font, WHITE, SCREEN_WIDTH // 2 - 200, 100)
    draw_text("Press Enter to Start", font, WHITE, SCREEN_WIDTH // 2 - 250, SCREEN_HEIGHT // 2)
    pygame.display.update()

# Helper functions
def draw_text(text, font, color, x, y):
    screen_text = font.render(text, True, color)
    screen.blit(screen_text, (x, y))

def create_falling_object():
    obj_data = random.choice(falling_objects)  # Randomly select one object type with associated sprite and value
    sprite = assets["objects"][obj_data["sprite"]]
    x_pos = random.randint(0, SCREEN_WIDTH - NORMAL_OBJECT_SIZE[0])
    y_pos = -NORMAL_OBJECT_SIZE[1]
    speed = random.randint(3, 6)
    obj = {"rect": pygame.Rect(x_pos, y_pos, *NORMAL_OBJECT_SIZE), "speed": speed, "sprite": sprite, "value": obj_data["value"]}
    return obj

def play_game():
    global score, hunger_bar, game_won, game_lost, object_spawn_timer
    screen.fill(BLACK)
    
    screen.blit(assets["game_background"], (0, 0))
    
    # Player rendering
    screen.blit(assets["player"], player_rect)
    
    # Object spawning
    if pygame.time.get_ticks() - object_spawn_timer > OBJECT_SPAWN_INTERVAL:
        objects.append(create_falling_object())
        object_spawn_timer = pygame.time.get_ticks()

    # Object rendering and movement
    for obj in objects[:]:
        obj["rect"].y += obj["speed"]

        if obj["rect"].y > SCREEN_HEIGHT:
            objects.remove(obj)
        else:
            screen.blit(obj["sprite"], obj["rect"])

            if player_rect.colliderect(obj["rect"]):
                score += obj["value"]
                hunger_bar = max(0, min(hunger_bar + obj["value"], 100))
                objects.remove(obj)

    if score >= WINNING_SCORE and hunger_bar == 100:
        game_won = True
    if hunger_bar <= LOSING_HUNGER_THRESHOLD:
        game_lost = True

    # Score and Hunger display
    font = pygame.font.SysFont(None, 36)
    draw_text(f"Score: {score}", font, WHITE, 10, 10)
    draw_text(f"Hunger: {hunger_bar}%", font, WHITE, 10, 40)

def start_game():
    global objects, score, hunger_bar, game_won, game_lost, object_spawn_timer, victory_scene, victory_image
    score = 0
    hunger_bar = 10
    game_won = False
    game_lost = False
    victory_scene = False
    victory_image = None
    objects = []
    object_spawn_timer = pygame.time.get_ticks()

def show_victory_scene():
    global victory_image, mouse_clicked

    if not victory_image:
        victory_image = random.choice(assets["victory_images"])

    screen.fill(BLACK)
    screen.blit(victory_image, (SCREEN_WIDTH // 2 - 200, 100))

    font = pygame.font.SysFont(None, 100)
    draw_text("You Fed Glutt!", font, WHITE, SCREEN_WIDTH // 2 - 250, 30)
    font = pygame.font.SysFont(None, 48)
    draw_text("Claim Your Badge!", font, WHITE, SCREEN_WIDTH // 2 - 150, 510)

    # Draw the button
    mouse_pos = pygame.mouse.get_pos()
    if button_rect.collidepoint(mouse_pos):
        pygame.draw.rect(screen, button_hover_color, button_rect)  # Change color on hover
    else:
        pygame.draw.rect(screen, button_color, button_rect)

    draw_text("Mint Collectible", button_font, BLACK, button_rect.x + 10, button_rect.y + 10)

    # Check for button click and ensure it only opens the URL once per click
    if pygame.mouse.get_pressed()[0]:
        if not mouse_clicked and button_rect.collidepoint(mouse_pos):
            webbrowser.open("https://opensea.io/collection/gluttog/overview", new=2)
            mouse_clicked = True  # Set flag so it doesn't repeat
    else:
        mouse_clicked = False  # Reset flag when mouse is released

def show_game_over():
    screen.fill(BLACK)
    font = pygame.font.SysFont(None, 72)
    draw_text("Game Over", font, WHITE, SCREEN_WIDTH // 2 - 200, SCREEN_HEIGHT // 2 - 50)

# Main loop
running = True
clock = pygame.time.Clock()

while running:
    clock.tick(FPS)
    
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_RETURN and not game_started:
                game_started = True
                start_game()
            elif event.key == pygame.K_ESCAPE:
                running = False

    keys = pygame.key.get_pressed()
    if keys[pygame.K_LEFT]:
        player_rect.x = max(0, player_rect.x - player_speed)
    if keys[pygame.K_RIGHT]:
        player_rect.x = min(SCREEN_WIDTH - PLAYER_WIDTH, player_rect.x + player_speed)

    if game_started:
        if game_won:
            show_victory_scene()
        elif game_lost:
            show_game_over()
        else:
            play_game()
    else:
        show_start_menu()

    pygame.display.update()
# Run Game ; python FeedGlutt_Game.py
pygame.quit()
